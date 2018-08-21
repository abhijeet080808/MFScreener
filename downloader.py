#!/usr/bin/env python3

import csv
import datetime
import math
import mutualfund
import os.path
import re
import requests


def get_first_day():
  # AMFI India does not have data before this date
  return datetime.date(2006, 4, 1)


def get_last_month_last_day():
  return datetime.date.today().replace(day=1) - datetime.timedelta(days=1)

def download_raw_nav(overwrite=False,
                     start_date=get_first_day(),
                     end_date=get_last_month_last_day(),
                     directory="nav"):

    # http://portal.amfiindia.com/DownloadNAVHistoryReport_Po.aspx?
    # frmdt=01-Jan-2008&todt=31-Jan-2008
    url = "http://portal.amfiindia.com/DownloadNAVHistoryReport_Po.aspx?"

    if not os.path.exists(directory):
        os.makedirs(directory)

    curr_date = start_date
    while curr_date <= end_date:
        start = curr_date
        # increment to next month
        curr_date = datetime.date(curr_date.year + int(curr_date.month / 12),
                                  ((curr_date.month % 12) + 1), 1)
        end = curr_date - datetime.timedelta(days=1)

        file_url = url + "frmdt=" + start.strftime("%d-%b-%Y") + \
                         "&todt=" + end.strftime("%d-%b-%Y")
        file_name = os.path.join(directory,
                                 "Nav-" + start.strftime("%Y-%m") + ".txt")

        if not os.path.isfile(file_name) or overwrite:
            r = requests.get(file_url, stream = True)
            open(file_name, "w").write(r.content)
            print("Downloaded " + file_name)
        else:
            print("Skipped downloading " + file_name)


def read_all_mf(start_date=get_first_day(),
                end_date=get_last_month_last_day(),
                directory="nav"):

    MONTHS = { "Jan" : 1, "Feb" : 2, "Mar" : 3, "Apr" : 4,
               "May" : 5, "Jun" : 6, "Jul" : 7, "Aug" : 8,
               "Sep" : 9, "Oct" : 10, "Nov" : 11, "Dec" : 12 }

    # int (code) vs MutualFund
    mutual_funds = dict()

    curr_date = start_date
    while curr_date <= end_date:
        file_name = os.path.join(directory, "Nav-" + \
                    curr_date.strftime("%Y-%m") + ".txt")

        with open(file_name, "r") as f:
            for line in f:
                # Scheme Code;Scheme Name;Net Asset Value;Repurchase Price;Sale Price;Date
                matches = re.match("^(\d+);(.+);(.+);(.*);(.*);(\d+)-(.+)-(\d+).*$", line)
                if (matches):
                    try:
                        code = int(matches.group(1))
                    except ValueError as e:
                        print("Code: " + str(e))
                        print(matches.group(0))
                        continue
                    name = matches.group(2).replace("\"", "").replace("'", "")
                    # silently drop
                    if matches.group(3) == "NA" or \
                       matches.group(3) == "N.A." or \
                       matches.group(3) == "N/A" or \
                       matches.group(3) == "#N/A" or \
                       matches.group(3) == "#DIV/0!" or \
                       matches.group(3) == "B.C." or \
                       matches.group(3) == "B. C." or \
                       "Div" in matches.group(3) or \
                       matches.group(3) == "-":
                           continue
                    try:
                        nav = round(float(matches.group(3).replace(",", "")), 4)
                    except ValueError as e:
                        print("Nav: " + str(e))
                        print(matches.group(0))
                        continue
                    if nav == 0:
                        continue
                    try:
                        year = int(matches.group(8))
                    except ValueError as e:
                        print("Year: " + str(e))
                        print(matches.group(0))
                        continue
                    try:
                        month = int(MONTHS[matches.group(7)])
                    except ValueError as e:
                        print("Month: " + str(e))
                        print(matches.group(0))
                        continue
                    try:
                        day = int(matches.group(6))
                    except ValueError as e:
                        print("Day: " + str(e))
                        print(matches.group(0))
                        continue
                    date = datetime.date(year, month, day);

                    if mutual_funds.get(code) is None:
                        mutual_funds[code] = \
                            mutualfund.MutualFund(
                                code,
                                set([name]),
                                dict([(date, mutualfund.MFData(nav=nav))]))
                    else:
                        mutual_funds[code].names.add(name)
                        mutual_funds[code].mf_data[date] = \
                            mutualfund.MFData(nav=nav)

                    if code == "108795":
                        print(eval(repr(mutual_funds[code])))

        #print("Processed " + file_name)
        # increment to next month
        curr_date = datetime.date(curr_date.year + int(curr_date.month / 12),
                                  ((curr_date.month % 12) + 1), 1)

    print("Processed " + str(len(mutual_funds)) + " mutual funds")
    return mutual_funds


def fill_missing_data(mutual_funds,
                      start_date=get_first_day(),
                      end_date=get_last_month_last_day()):

    for mf in mutual_funds.values():
        curr_date = start_date

        first_date = min(mf.mf_data.keys())
        last_date = max(mf.mf_data.keys())

        while curr_date <= end_date:
            if curr_date > first_date and \
               curr_date < last_date and \
               mf.mf_data.get(curr_date) is None:
                   # fill gaps with previous days's value
                   mf.mf_data[curr_date] = \
                       mf.mf_data[curr_date - datetime.timedelta(days=1)]
            curr_date = curr_date + datetime.timedelta(days=1)

        #print("Cleaned " + str(mf.code))

    print("Cleaned up " + str(len(mutual_funds)) + " mutual funds")
    return mutual_funds


def calculate_cagr(mf_code, date, nav_present, nav_past, years):

    # return = (final_value - initial_value) / initial_value x 100
    # cagr = ((final_value / initial_value)^(1 / number of periods) - 1) x 100

    try:
        return round(
            (math.pow((nav_present / nav_past), (1 / years)) - 1) * 100, 4)
    except ValueError as e:
        print("Error: " + \
              " mf_code " + str(mf_code) + \
              " date " + str(date) + \
              " nav_present " + str(nav_present) + \
              " nav_past " + str(nav_past) + \
              " years " + str(years))
        raise


def add_rolling_returns(mutual_funds):

    for mf in mutual_funds.values():

        for nav_date in mf.mf_data:
            nav_today = mf.mf_data[nav_date].nav

            mf_data_one_year_ago = \
                mf.mf_data.get(nav_date - datetime.timedelta(days=365))
            if mf_data_one_year_ago is None:
                continue
            nav_one_year_ago = mf_data_one_year_ago.nav
            mf.mf_data[nav_date].one_year_ret = \
                calculate_cagr(mf.code,
                               nav_date,
                               nav_today,
                               nav_one_year_ago,
                               1)

            mf_data_three_year_ago = \
                mf.mf_data.get(nav_date - datetime.timedelta(days=1095))
            if mf_data_three_year_ago is None:
                continue
            nav_three_year_ago = mf_data_three_year_ago.nav
            mf.mf_data[nav_date].three_year_ret = \
                calculate_cagr(mf.code,
                               nav_date,
                               nav_today,
                               nav_three_year_ago,
                               3)

            mf_data_five_year_ago = \
                mf.mf_data.get(nav_date - datetime.timedelta(days=1825))
            if mf_data_five_year_ago is None:
                continue
            nav_five_year_ago = mf_data_five_year_ago.nav
            mf.mf_data[nav_date].five_year_ret = \
                calculate_cagr(mf.code,
                               nav_date,
                               nav_today,
                               nav_five_year_ago,
                               5)

        #print("Calculated rolling returns for " + str(mf.code))

    print("Calculated rolling returns for " + str(len(mutual_funds)) + \
          " mutual funds")
    return mutual_funds


def write_mf_nav_to_csv(mutual_funds, directory="static/csv"):

    if not os.path.exists(directory):
        os.makedirs(directory)

    for mf in mutual_funds.values():
        file_name = os.path.join(directory, str(mf.code) + ".csv")
        with open(file_name, "w") as f:
            writer = csv.writer(f)
            for nav_date in sorted(mf.mf_data.keys()):
                # None is written as empty string
                writer.writerow([nav_date,
                                 mf.mf_data[nav_date].nav,
                                 mf.mf_data[nav_date].one_year_ret,
                                 mf.mf_data[nav_date].three_year_ret,
                                 mf.mf_data[nav_date].five_year_ret])

        #print("Wrote " + file_name)

    print("Wrote CSVs for " + str(len(mutual_funds)) + " mutual funds")


def write_mf_lookup_to_csv(mutual_funds, directory="static/csv"):

    if not os.path.exists(directory):
        os.makedirs(directory)

    file_name = os.path.join(directory, "mf_code_names.csv")
    with open(file_name, "w") as f:
        writer = csv.writer(f)
        for mf_code in sorted(mutual_funds.keys()):
            mf_names = list(mutual_funds[mf_code].names)
            mf_names.insert(0, str(mf_code))
            writer.writerow(mf_names)

    print("Wrote " + file_name)


def main():
    print("Start Date: " + str(get_first_day()))
    print("End Date: " + str(get_last_month_last_day()))

    download_raw_nav()
    mutual_funds = read_all_mf()
    mutual_funds = fill_missing_data(mutual_funds)
    mutual_funds = add_rolling_returns(mutual_funds)
    write_mf_nav_to_csv(mutual_funds)
    write_mf_lookup_to_csv(mutual_funds)

if __name__== "__main__":
    main()
