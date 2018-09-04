#!/usr/bin/env python3

import os
import subprocess
import sys

print(sys.executable)
subprocess.call("date")

# download latest nav
ret = subprocess.call([sys.executable, "downloader.py"])
if ret != 0:
    sys.exit("Downloading latest NAVs failed")

# process them
ret = subprocess.call(["./downloader"])
if ret != 0:
    sys.exit("Processing NAVs failed")

# convert mf statement from pdf to txt
ret = subprocess.call(["pdftotext",
                       "Consolidated.pdf",
                       "Consolidated.txt",
                       "-layout"])
if ret != 0:
    sys.exit("Conversion of MF statement to PDF failed")

# process mf statement
ret = subprocess.call([sys.executable, "pdfparser.py"])
if ret != 0:
    sys.exit("Parsing of MF statement failed")

print("Completed successfully")
subprocess.call("date")
