#!/usr/bin/python3

# https://www.tutorialspoint.com/flask/flask_quick_guide.htm
# http://flask.pocoo.org/docs/1.0/

import csv
import os

from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():

    return render_template('index.html',
                           name = "Abhijeet",
                           mf_codes = get_mf_name_codes())


def get_mf_name_codes():

    mf_name_codes = []

    file_name = os.path.join("static/csv", "mf_code_names.csv")
    with open(file_name) as f:
        csv_reader = csv.reader(f, delimiter=',')
        for row in csv_reader:
            mf_name_codes.append(\
                "{mfcode: \"" + row[0] + "\", label: \"" + row[1] + "\"}")

    return mf_name_codes


if __name__ == '__main__':
    app.run()
