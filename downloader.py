#!/usr/bin/python

import csv
import datetime
import mutualfund
import os.path
import re
import requests

from copy import deepcopy

# http://portal.amfiindia.com/DownloadNAVHistoryReport_Po.aspx?frmdt=01-Jan-2008&todt=31-Jan-2008
url = "http://portal.amfiindia.com/DownloadNAVHistoryReport_Po.aspx?"

start_date = datetime.date(2006, 4, 1)
end_date = datetime.date(2018, 7, 31)

curr_date = start_date
while curr_date <= end_date:
    start = curr_date
    # increment to next month
    curr_date = datetime.date(curr_date.year + (curr_date.month / 12), ((curr_date.month % 12) + 1), 1)
    end = curr_date - datetime.timedelta(days=1)

    file_url = url + "frmdt=" + start.strftime("%d-%b-%Y") + "&todt=" + end.strftime("%d-%b-%Y")
    file_name = "nav/Nav-" + start.strftime("%Y-%m") + ".txt"

    if not os.path.isfile(file_name):
        print "Downloading for " + start.strftime("%b-%Y")
        r = requests.get(file_url, stream = True)
        open(file_name, "wb").write(r.content)
        print "Downloaded to " + file_name
    else:
        print "Skipping downloading " + file_name

mutual_funds = dict()
MONTHS = { "Jan" : 1,
           "Feb" : 2,
           "Mar" : 3,
           "Apr" : 4,
           "May" : 5,
           "Jun" : 6,
           "Jul" : 7,
           "Aug" : 8,
           "Sep" : 9,
           "Oct" : 10,
           "Nov" : 11,
           "Dec" : 12 }

curr_date = start_date
while curr_date <= end_date:
    file_name = "nav/Nav-" +  curr_date.strftime("%Y-%m") + ".txt"
    print "Processing " + file_name
    with open(os.path.join(".", file_name), "r") as f:
        for line in f:
            # Scheme Code;Scheme Name;Net Asset Value;Repurchase Price;Sale Price;Date
            matches = re.match("^(\d+);(.+);(.+);(.+);(.+);(\d+)-(.+)-(\d+).*$", line)
            if (matches):
                try:
                    code = int(matches.group(1))
                except ValueError as e:
                    print "Code: " + str(e)
                    print matches.group(0)
                    continue
                name = matches.group(2)
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
                    nav = float(matches.group(3).replace(",", ""))
                except ValueError as e:
                    print "Nav: " + str(e)
                    print matches.group(0)
                    continue
                try:
                    year = int(matches.group(8))
                except ValueError as e:
                    print "Year: " + str(e)
                    print matches.group(0)
                    continue
                try:
                    month = int(MONTHS[matches.group(7)])
                except ValueError as e:
                    print "Month: " + str(e)
                    print matches.group(0)
                    continue
                try:
                    day = int(matches.group(6))
                except ValueError as e:
                    print "Day: " + str(e)
                    print matches.group(0)
                    continue
                date = datetime.date(year, month, day);

                if mutual_funds.get(code) is None:
                    mutual_funds[code] = mutualfund.MutualFund(code, set([name]), dict([(date, nav)]))
                else:
                    mutual_funds[code].names.add(name)
                    mutual_funds[code].navs[date] = nav

                #print eval(repr(mutual_funds[code]))

    # increment to next month
    curr_date = datetime.date(curr_date.year + (curr_date.month / 12), ((curr_date.month % 12) + 1), 1)

print "Processed " + str(len(mutual_funds)) + " mutual funds"

for mf in mutual_funds.values():
    curr_date = start_date

    # set all values to 0 until first value is encountered
    if mf.navs.get(curr_date) is None:
        mf.navs[curr_date] = "0.0"
    curr_date = curr_date + datetime.timedelta(days=1)

    while curr_date <= end_date:
        if mf.navs.get(curr_date) is None:
            # fill with previous days's value
            mf.navs[curr_date] = mf.navs[curr_date - datetime.timedelta(days=1)]
        curr_date = curr_date + datetime.timedelta(days=1)

    file_name = "csv/" + str(mf.code) + ".csv"
    with open(file_name, "wb") as outfile:
        writer = csv.writer(outfile)
        for nav_date in sorted(mf.navs.keys()):
            writer.writerow([nav_date, mf.navs[nav_date]])

    print "Wrote " + file_name

file_name = "csv/code_names.csv"
with open(file_name, "wb") as outfile:
    writer = csv.writer(outfile)
    for mf_code in sorted(mutual_funds.keys()):
        mf_names = list(mutual_funds[mf_code].names)
        mf_names.insert(0, str(mf_code))
        writer.writerow(mf_names)

print "Completed writing " + str(len(mutual_funds) + 1) + " files"
