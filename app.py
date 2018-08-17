#!/usr/bin/python

# https://www.tutorialspoint.com/flask/flask_quick_guide.htm
# http://flask.pocoo.org/docs/1.0/

from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
  return render_template('index.html', name = "Abhijeet")

if __name__ == '__main__':
  app.run()
