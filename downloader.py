#!/usr/bin/env python3

import datetime
import os.path
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

    print("Downloading mutual fund files")

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
            open(file_name, "wb").write(r.content)
            print("Downloaded " + file_name)
        #else:
        #    print("Skipped downloading " + file_name)

    print("Downloaded all mutual fund files")


def main():

    print("Start Date: " + str(get_first_day()))
    print("End Date: " + str(get_last_month_last_day()))

    start_time = datetime.datetime.now()

    download_raw_nav()

    print("Time taken " + str(datetime.datetime.now() - start_time))


if __name__== "__main__":
    main()
