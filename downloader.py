#!/usr/bin/env python3

import csv
import datetime
import math
import mutualfund
import os.path
import progressbar # pip3 install progressbar2
import pymongo
import re
import requests
import statistics


def get_first_day():
  # AMFI India does not have data before this date
  return datetime.date(2006, 4, 1)


def get_last_month_last_day():
  return datetime.date.today().replace(day=1) - datetime.timedelta(days=1)


def print_mf(mf):
    for date in mf.mf_data:
        print(str(mf.code) + " " + str(date) + " " + str(mf.mf_data[date].nav))


def download_raw_nav(overwrite=False,
                     start_date=get_first_day(),
                     end_date=get_last_month_last_day(),
                     directory="nav"):

    print("Downloading mutual fund files")

    # http://portal.amfiindia.com/DownloadNAVHistoryReport_Po.aspx?
    # frmdt=01-Jan-2008&todt=31-Jan-2008
    url = "http://portal.amfiindia.com/DownloadNAVHistoryReport_Po.aspx?"

    if not os.path.exists(directory):
        os.makedirs(directory)

    curr_date = start_date
    span_days = (end_date - curr_date).days
    bar = progressbar.ProgressBar(max_value=span_days, redirect_stdout=True)

    while curr_date <= end_date:
        bar.update(span_days - (end_date - curr_date).days)

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
        #else:
        #    print("Skipped downloading " + file_name)

    bar.finish()
    print("Downloaded all mutual fund files")


def read_all_mf(start_date=get_first_day(),
                end_date=get_last_month_last_day(),
                directory="nav"):

    print("Reading mutual fund files")

    MONTHS = { "Jan" : 1, "Feb" : 2, "Mar" : 3, "Apr" : 4,
               "May" : 5, "Jun" : 6, "Jul" : 7, "Aug" : 8,
               "Sep" : 9, "Oct" : 10, "Nov" : 11, "Dec" : 12 }

    db = pymongo.MongoClient().mfscreener
    db.mutual_fund_info.create_index([("code", pymongo.ASCENDING)])
    db.mutual_fund_nav.create_index([("code", pymongo.ASCENDING)])
    #db.mutual_fund_nav.create_index([("date", pymongo.ASCENDING)])

    curr_date = start_date
    span_days = (end_date - curr_date).days
    bar = progressbar.ProgressBar(max_value=span_days, redirect_stdout=True)

    while curr_date <= end_date:
        bar.update(span_days - (end_date - curr_date).days)

        file_name = os.path.join(directory, "Nav-" + \
                    curr_date.strftime("%Y-%m") + ".txt")

        # mf code vs mf code and mf name
        mutual_fund_infos = dict()
        # mf code vs mf code, mf date and mf nav
        mutual_fund_navs = dict()

        with open(file_name, "r") as f:
            for line in f:
                # Scheme Code;Scheme Name;Net Asset Value;
                # Repurchase Price;Sale Price;Date
                matches = re.match("^(\d+);(.+);(.+);" + \
                                   "(.*);(.*);(\d+)-(.+)-(\d+).*$", line)
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

                    if nav == 0:
                        continue

                    if nav < 0:
                        print("Dropping " + str(code) + " " + \
                              str(date) + " " + str(nav))
                        continue

                    mutual_fund_infos[code] = { "code": code, "name": name }
                    mutual_fund_navs[str(code) + "-" + date.isoformat()] = \
                        { "code": code, "date": date.isoformat(), "nav": nav }

        #db.mutual_fund_info.insert_many(list(mutual_fund_infos.values()))
        db.mutual_fund_nav.insert_many(list(mutual_fund_navs.values()))


        #print("Processed " + file_name)
        # increment to next month
        curr_date = datetime.date(curr_date.year + int(curr_date.month / 12),
                                  ((curr_date.month % 12) + 1), 1)

    bar.finish()
    #print("Read " + str(len(mutual_funds)) + " mutual fund files")
    #return mutual_funds


def fill_missing_data(mutual_funds,
                      start_date=get_first_day(),
                      end_date=get_last_month_last_day()):

    print("Cleaning up mutual funds data")

    i = 0
    bar = progressbar.ProgressBar(max_value=len(mutual_funds),
                                  redirect_stdout=True)

    for mf in mutual_funds.values():
        bar.update(i)
        i += 1

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

    bar.finish()
    print("Cleaned up " + str(len(mutual_funds)) + " mutual funds")
    return mutual_funds


def calculate_cagr(mf, date, years):

    # return = (final_value - initial_value) / initial_value x 100
    # cagr = ((final_value / initial_value)^(1 / number of periods) - 1) x 100

    nav_today = mf.mf_data[date].nav

    mf_data_past = \
        mf.mf_data.get(date - datetime.timedelta(days=((365 * years) - 1)))

    if mf_data_past is None:
      return None

    nav_past = mf_data_past.nav

    return round(
        (math.pow((nav_today / nav_past), (1 / years)) - 1) * 100, 4)


#def calculate_std_deviation(years):

    # Standard Deviation (SD) = Square root of Variance (V)
    # Variance = squared difference between each monthly return +
    #            mean / number of monthly return data – 1


def add_statistics(mutual_funds):

    print("Adding statistics for mutual funds")

    i = 0
    bar = progressbar.ProgressBar(max_value=len(mutual_funds),
                                  redirect_stdout=True)

    for mf in mutual_funds.values():
        bar.update(i)
        i += 1

        total_nav_one_yr = 0.0
        total_nav_three_yr = 0.0
        total_nav_five_yr = 0.0

        num_nav_one_yr = 0
        num_nav_three_yr = 0
        num_nav_five_yr = 0

        for nav_date in sorted(mf.mf_data.keys()):
            mf.mf_data[nav_date].one_year_ret = \
                calculate_cagr(mf, nav_date, 1)

            mf.mf_data[nav_date].three_year_ret = \
                calculate_cagr(mf, nav_date, 3)

            mf.mf_data[nav_date].five_year_ret = \
                calculate_cagr(mf, nav_date, 5)

            total_nav_one_yr += mf.mf_data[nav_date].nav
            num_nav_one_yr += 1

            total_nav_three_yr += mf.mf_data[nav_date].nav
            num_nav_three_yr += 1

            total_nav_five_yr += mf.mf_data[nav_date].nav
            num_nav_five_yr += 1

            if num_nav_one_yr == 365:
                mf.mf_data[nav_date].one_year_avg = \
                    round(total_nav_one_yr / 365, 4)
                total_nav_one_yr -= \
                    mf.mf_data[nav_date - datetime.timedelta(days=364)].nav
                num_nav_one_yr -= 1

            if num_nav_three_yr == 1095:
                mf.mf_data[nav_date].three_year_avg = \
                    round(total_nav_three_yr / 1095, 4)
                total_nav_three_yr -= \
                    mf.mf_data[nav_date - datetime.timedelta(days=1094)].nav
                num_nav_three_yr -= 1

            if num_nav_five_yr == 1825:
                mf.mf_data[nav_date].five_year_avg = \
                    round(total_nav_five_yr / 1825, 4)
                total_nav_five_yr -= \
                    mf.mf_data[nav_date - datetime.timedelta(days=1824)].nav
                num_nav_five_yr -= 1

        #print("Calculated statistics for " + str(mf.code))

    bar.finish()
    print("Added statistics for " + str(len(mutual_funds)) + \
          " mutual funds")
    return mutual_funds


def write_mf_nav_to_csv(mutual_funds, directory="static/csv"):

    print("Writing mutual funds to CSVs")

    if not os.path.exists(directory):
        os.makedirs(directory)

    i = 0
    bar = progressbar.ProgressBar(max_value=len(mutual_funds),
                                  redirect_stdout=True)

    for mf in mutual_funds.values():
        bar.update(i)
        i += 1

        file_name = os.path.join(directory, str(mf.code) + ".csv")
        with open(file_name, "w") as f:
            writer = csv.writer(f)
            for nav_date in sorted(mf.mf_data.keys()):
                # None is written as empty string
                writer.writerow([nav_date,
                                 mf.mf_data[nav_date].nav,
                                 mf.mf_data[nav_date].one_year_ret,
                                 mf.mf_data[nav_date].three_year_ret,
                                 mf.mf_data[nav_date].five_year_ret,
                                 mf.mf_data[nav_date].one_year_avg,
                                 mf.mf_data[nav_date].three_year_avg,
                                 mf.mf_data[nav_date].five_year_avg])

        #print("Wrote " + file_name)

    bar.finish()
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

    start_time = datetime.datetime.now()

    download_raw_nav()
    read_all_mf()
    #mutual_funds = read_all_mf()
    #mutual_funds = fill_missing_data(mutual_funds)
    #mutual_funds = add_statistics(mutual_funds)
    #write_mf_nav_to_csv(mutual_funds)
    #write_mf_lookup_to_csv(mutual_funds)

    print("Time taken " + str(datetime.datetime.now() - start_time))


if __name__== "__main__":
    main()
