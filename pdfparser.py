#!/usr/bin/env python3

import csv
import datetime
import re


class MfTransaction:
    def __init__(self, mf_date, mf_code, mf_action, mf_units,
                 mf_nav, mf_amount):
        self.mf_date = mf_date          # date of transaction
        self.mf_code = mf_code          # mf code
        self.mf_action = mf_action      # action is BUY or SELL
        self.mf_units = mf_units        # mf units bought or sold
        self.mf_nav = mf_nav            # mf nav on the day
        self.mf_amount = mf_amount      # amount bought or sold

    def __repr__(self):
        return "MfTransaction(" + repr(self.mf_date) + ", " + \
                                  repr(self.mf_code) + ", " + \
                                  repr(self.mf_action) + ", " + \
                                  repr(self.mf_units) + ", " + \
                                  repr(self.mf_nav) + ", " + \
                                  repr(self.mf_amount) + ")"


def ReadMFCodes():
    # mf name vs mf code
    mf_code_names = dict()

    vocabulary = set()

    with open("static/csv/mf_code_names.csv") as f:
        content = f.readlines()
        for line in content:
            parts = line.split(",")
            if len(parts) != 2:
                raise ValueError("Failed to read " + line)

            mf_code = int(parts[0])
            mf_name = parts[1]

            mf_code_names[mf_name.strip("\n")] = mf_code

            for c in mf_name:
                vocabulary.add(c)

    #print("Vocabulary " + str(sorted(vocabulary)))
    #print(mf_names)

    return mf_code_names


def GetSet(mfName):
    # get a set of all words in the mfName
    mfNameList = list(re.split("\-| ", mfName.strip().lower()))
    mfNameList = [x.strip() for x in mfNameList]

    mfNameSet = set(mfNameList)

    if "" in mfNameSet:
        mfNameSet.remove("")

    if "plan" in mfNameSet:
        mfNameSet.remove("plan")

    if "option" in mfNameSet:
        mfNameSet.remove("option")

    if "fund" in mfNameSet:
        mfNameSet.remove("fund")

    if "smallcap" in mfNameSet:
        mfNameSet.remove("smallcap")
        mfNameSet.add("small")
        mfNameSet.add("cap")

    if "midcap" in mfNameSet:
        mfNameSet.remove("midcap")
        mfNameSet.add("mid")
        mfNameSet.add("cap")

    if "largecap" in mfNameSet:
        mfNameSet.remove("largecap")
        mfNameSet.add("large")
        mfNameSet.add("cap")

    if "bluechip" in mfNameSet:
        mfNameSet.remove("bluechip")
        mfNameSet.add("blue")
        mfNameSet.add("chip")

    if "regular" not in mfNameSet and "direct" not in mfNameSet:
        mfNameSet.add("regular")

    return mfNameSet


def ClosestMf(mfCodeNames, mfName):
    mf_code_name_keys = mfCodeNames.keys()
    mf_name_set = GetSet(mfName)

    # ^ of 2 sets returns set with elements not present in both sets
    min_key = min(mf_code_name_keys,
                  key=lambda mf_code_name_key:
                    len(GetSet(mf_code_name_key) ^ mf_name_set))

    #print("Matched " + mfName + " as " + min_key)
    return mfCodeNames[min_key]


def ParseConsolidatedStatement(mfCodeNames):
    # pdftotext Consolidated.pdf Consolidated.txt -layout

    # Folio No : 91026529743 PAN: AVUPB5696C KYC : OK PAN : NOT OK
    # 128CFGPG-Axis Liquid Fund - Growth (Advisor:ARN-84967) Registrar : KARVY
    # Opening Unit Balance 0.000
    # 10-OCT-2016 Purchase 5,000.00 2.868 1,743.3603 2.868
    # 01-AUG-2018 Redemption (74,633.61) (37.937) 1,967.3039 0.000
    # Closing Unit Balance: 0.000 NAV on 31-AUG-2018 : INR 1,978.7344 Valuation on 31-AUG-2018 : INR 0.00

    table_header_pattern = (
            r'^.*Folio.*PAN.*KYC.*PAN.*\n' +
            r'^(.*?)[ \t]+Registrar.*\n' +             # .*? is non greedy match
            r'^[\s\S]*?Opening Unit Balance.*\n' +  # [\s\S] is match anything
            r'^([\s\S]*?)' +
            r'^.*Closing Unit Balance.*?([\d,.]+).*$'
    )

    table_row_pattern = (
            r'^[ \t]*(\d{2})-([A-Z]{3})-(\d{4})[ \t]+' +    # date
            r'(\w.*?)[ \t]+' +                              # transaction
            r'([\(-])?([\d,.]+)\)?[ \t]+' +                    # amount paid
            r'([\(-])?([\d,.]+)\)?[ \t]+' +                    # units purchased
            r'([\d,.]+)[ \t]+' +                            # nav value
            r'([\d,.]+)[ \t]*$'                             # total units
    )

    # 128TSGPG-Axis Long Term Equity Fund - Growth (Advisor:ARN-84967)
    mf_name_pattern = (
            r'^\w+\s*\-\s*(.*?)\s*(\(Advisor.*?\).*)?$'
    )

    # dict of datetime.datetime vs (dict of MfCode vs MfTransaction)
    transactions = dict()

    with open("Consolidated.txt") as f:
        data = f.read()

        for hdr_match in re.finditer(table_header_pattern, data, re.MULTILINE):
            mf_name = hdr_match.group(1)
            mf_data = hdr_match.group(2)
            mf_total_units = hdr_match.group(3)

            mf_name_match = re.match(mf_name_pattern, mf_name)
            mf_name = mf_name_match.group(1)

            mf_code = int(ClosestMf(mfCodeNames, mf_name))
            print("Parsed " + mf_name + " as " + str(mf_code))

            total_nav_units = float(mf_total_units.replace(",", ""))

            counted_nav_units = 0

            for row_match in re.finditer(table_row_pattern, mf_data, re.MULTILINE):
                mf_day = row_match.group(1)
                mf_mnth = row_match.group(2)
                mf_yr = row_match.group(3)

                mf_type = row_match.group(4)

                mf_amnt_negative = row_match.group(5)
                mf_amount = row_match.group(6)
                mf_units_negative = row_match.group(7)
                mf_units = row_match.group(8)
                mf_nav = row_match.group(9)
                mf_total_units = row_match.group(10)

                mf_action = ""
                if mf_units_negative is None:
                    mf_action = "BUY"
                else:
                    mf_action = "SELL"

                mf_date = datetime.datetime.strptime(
                        mf_day + " " + mf_mnth + " " + mf_yr, "%d %b %Y")

                t = MfTransaction(mf_date,
                                  mf_code,
                                  mf_action,
                                  float(mf_units.replace(",", "")),
                                  float(mf_nav.replace(",", "")),
                                  float(mf_amount.replace(",", "")))

                if abs((t.mf_units * t.mf_nav) - t.mf_amount) >= 2:
                    raise ValueError("Erronous transaction " + str(t))

                print("New transaction " + str(t))

                if transactions.get(mf_date) is None:
                    transactions[mf_date] = dict()

                # each date can have only one transaction for a mf
                if transactions[mf_date].get(mf_code) is not None:
                    old_t = transactions[mf_date][mf_code]

                    print("Combining old transaction " + str(old_t) +
                          " and new transaction " + str(t))

                    if old_t.mf_action == "BUY" and t.mf_action == "BUY":
                        old_t.mf_nav = round(
                            (old_t.mf_amount + t.mf_amount) / \
                            (old_t.mf_units + t.mf_units), 4)
                        old_t.mf_units = old_t.mf_units + t.mf_units
                        old_t.mf_amount = old_t.mf_amount + t.mf_amount
                        transactions[mf_date][mf_code] = old_t

                    elif old_t.mf_action == "SELL" and t.mf_action == "SELL":
                        old_t.mf_nav = round(
                            (old_t.mf_amount + t.mf_amount) / \
                            (old_t.mf_units + t.mf_units), 4)
                        old_t.mf_units = old_t.mf_units + t.mf_units
                        old_t.mf_amount = old_t.mf_amount + t.mf_amount
                        transactions[mf_date][mf_code] = old_t

                    elif old_t.mf_action == "BUY" and t.mf_action == "SELL":
                        if old_t.mf_amount > t.mf_amount:
                            old_t.mf_nav = round(
                                (old_t.mf_amount - t.mf_amount) / \
                                (old_t.mf_units - t.mf_units), 4)
                            old_t.mf_units = old_t.mf_units - t.mf_units
                            old_t.mf_amount = old_t.mf_amount - t.mf_amount
                            transactions[mf_date][mf_code] = old_t
                        elif old_t.mf_amount < t.mf_amount:
                            old_t.mf_nav = round(
                                (t.mf_amount - old_t.mf_amount) / \
                                (t.mf_units - old_t.mf_units), 4)
                            old_t.mf_units = t.mf_units - old_t.mf_units
                            old_t.mf_amount = t.mf_amount - old_t.mf_amount
                            old_t.mf_action = "SELL"
                            transactions[mf_date][mf_code] = old_t
                        else: # old_t.mf_amount == t.mf_amount
                            del(transactions[mf_date][mf_code])
                            if len(transactions[mf_date]) == 0:
                                del(transactions[mf_date])

                    elif old_t.mf_action == "SELL" and t.mf_action == "BUY":
                        if old_t.mf_amount > t.mf_amount:
                            old_t.mf_nav = round(
                                (old_t.mf_amount - t.mf_amount) / \
                                (old_t.mf_units - t.mf_units), 4)
                            old_t.mf_units = old_t.mf_units - t.mf_units
                            old_t.mf_amount = old_t.mf_amount - t.mf_amount
                            transactions[mf_date][mf_code] = old_t
                        elif old_t.mf_amount < t.mf_amount:
                            old_t.mf_nav = round(
                                (t.mf_amount - old_t.mf_amount) / \
                                (t.mf_units - old_t.mf_units), 4)
                            old_t.mf_units = t.mf_units - old_t.mf_units
                            old_t.mf_amount = t.mf_amount - old_t.mf_amount
                            old_t.mf_action = "BUY"
                            transactions[mf_date][mf_code] = old_t
                        else: # old_t.mf_amount == t.mf_amount
                            del(transactions[mf_date][mf_code])
                            if len(transactions[mf_date]) == 0:
                                del(transactions[mf_date])

                    if transactions.get(mf_date) is not None and \
                       transactions[mf_date].get(mf_code) is not None:
                        print("Combined transaction is " +
                            str(transactions[mf_date][mf_code]))
                    else:
                        print("Deleted both transaction pair")

                else:
                    transactions[mf_date][mf_code] = t

                if mf_action == "BUY":
                    counted_nav_units += float(mf_units.replace(",", ""))
                else:
                    counted_nav_units -= float(mf_units.replace(",", ""))

            if  abs(total_nav_units - counted_nav_units) > 0.00001:
                raise ValueError("For " + str(mf_code) +
                                 " expected total nav units " +
                                 str(total_nav_units) +
                                 ", calculated total nav units " +
                                 str(counted_nav_units))

    return transactions


def ReadNav(mfCode):
    # dict of datetime.datetime vs nav
    mf_navs = dict()
    print("Reading static/csv/" + str(mfCode) + ".csv")
    with open("static/csv/" + str(mfCode) + ".csv") as f:
        content = f.readlines()
        for line in content:
            parts = line.split(",")
            if len(parts) < 2:
                raise ValueError("Failed to read " + line)

            mf_date = datetime.datetime.strptime(parts[0], "%Y-%m-%d")
            mf_nav = float(parts[1])

            mf_navs[mf_date] = mf_nav

    return mf_navs


def WriteToCsv(transactions):
    start_date = min(transactions.keys())
    end_date = datetime.datetime(datetime.datetime.today().year,
                                 datetime.datetime.today().month,
                                 datetime.datetime.today().day)

    with open("static/csv/transactions.csv", "w") as f:
        writer = csv.writer(f)
        writer.writerow(["Date", "MF Code", "Action", "Units", "Nav", "Cost",
                         "Total Units", "Total Cost", "Total Value"])

        # dict of mf code vs (list of total units and total amount)
        mf_totals = dict()

        # dict of mf code vs (dict of datetime.datetime vs nav)
        mf_navs = dict()

        curr_date = start_date
        while curr_date <= end_date:
            day_transactions = transactions.get(curr_date)

            if day_transactions is not None:
                for mf_code in sorted(day_transactions):
                    t = day_transactions[mf_code]

                    # update mf totals
                    if mf_totals.get(t.mf_code) is None:
                        if t.mf_action == "BUY":
                            mf_totals[t.mf_code] = [t.mf_units, t.mf_amount]
                        else:
                            raise ValueError(str(t.mf_code) + " has SELL on " +
                                             str(t.mf_date))
                    else:
                        if t.mf_action == "BUY":
                            mf_totals[t.mf_code][0] = \
                                mf_totals[t.mf_code][0] + t.mf_units
                            mf_totals[t.mf_code][1] = \
                                mf_totals[t.mf_code][1] + t.mf_amount
                        else: # SELL
                            # nav = amount / units
                            combined_buy_nav = \
                                mf_totals[t.mf_code][1] / \
                                mf_totals[t.mf_code][0]

                            mf_totals[t.mf_code][0] = \
                                mf_totals[t.mf_code][0] - t.mf_units
                            mf_totals[t.mf_code][1] = \
                                mf_totals[t.mf_code][0] * combined_buy_nav

            to_be_removed_codes = list()
            for mf_code in sorted(mf_totals):

                # read all navs for the mf if not done before
                if mf_navs.get(mf_code) is None:
                    mf_navs[mf_code] = ReadNav(mf_code)
                # get nav if available
                current_value = None
                if mf_navs[mf_code].get(curr_date) is not None:
                    current_value = round(
                        mf_totals[mf_code][0] * mf_navs[mf_code][curr_date],
                        4)

                if day_transactions is None or \
                   day_transactions.get(mf_code) is None:
                    writer.writerow(
                        [curr_date.strftime("%Y-%m-%d"),
                         mf_code, "", "", "", "",
                         # total units
                         round(mf_totals[mf_code][0], 4),
                         # total invested amount
                         round(mf_totals[mf_code][1], 4),
                         # total current value
                         current_value])
                else:
                    t = day_transactions[mf_code]
                    writer.writerow(
                        [t.mf_date.strftime("%Y-%m-%d"),
                         t.mf_code,
                         t.mf_action,
                         t.mf_units,
                         t.mf_nav,
                         t.mf_amount,
                         round(mf_totals[t.mf_code][0], 4),
                         round(mf_totals[t.mf_code][1], 4),
                         current_value])

                # remove this entry if there are no units left after SELL
                if abs(mf_totals[mf_code][0]) < 0.001:
                    to_be_removed_codes.append(mf_code)

            for mf_code in to_be_removed_codes:
                del(mf_totals[mf_code])

            curr_date = curr_date + datetime.timedelta(days=1)

    print("Wrote all transactions")


def main():
    mf_code_names = ReadMFCodes()
    transactions = ParseConsolidatedStatement(mf_code_names)
    WriteToCsv(transactions)


if __name__ == "__main__":
    main()
