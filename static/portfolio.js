"use strict";

var chartColors;

var portfolioConfig;
var portfolioChart;

$(function() {
  portfolioConfig = {
    type: "line",
    data: {
      labels: [],
      datasets: []
    },
    options: {
      title: {
        display: false,
      },
      legend: {
        display: true,
        position: "top"
      },
      tooltips: {
        mode: 'index'
      },
      responsive: false,
      maintainAspectRatio: false,
      scales: {
        yAxes: [{
          id: "VAL",
          position: "left",
          type: "linear",
          stacked: true,
          ticks: {
            suggestedMin: 0,
          },
          scaleLabel: {
            display: true,
            labelString: "Value"
          }
        }, {
          id: "XIRR",
          position: "right",
          type: "linear",
          ticks: {
            suggestedMin: 0,
          },
          scaleLabel: {
            display: true,
            labelString: "XIRR"
          }
        }]
      }
    }
  };

  portfolioChart =  new Chart(document.getElementById("canvasPortfolioChart"),
                              portfolioConfig);

  readCsvFile("/static/csv/transactions.csv")
})

function readCsvFile(url) {
  // read text from URL location
  console.log("Reading " + url);
  var req = new XMLHttpRequest();
  req.open("GET", url, true);
  req.send();

  req.onreadystatechange = function() {
    // file is downloaded
    if (req.readyState === XMLHttpRequest.DONE) {
      addChart(readCsv(req.responseText));
    }
  }
}

function readCsv(csvData) {
  // read all csv entries to a dict
  var csvLines = csvData.split(/\r?\n/);
  // remove last empty element
  csvLines.splice(-1);
  // date vs (dict of mfCode vs csv data)
  var mfValues = {};
  var mfCodes = [];
  // date vs xirr
  var xirrValues = {};
  var startDate = moment(); // now
  for (var i = 0; i < csvLines.length; i++) {
    var entries = csvLines[i].split(",");
    if (entries.length > 1) {
      // remove first elem and put in as date
      var dateStr = entries.splice(0, 1);
      var date = moment(dateStr, "YYYY-MM-DD");
      if (date.isValid() == false) {
        console.log("Dropping " + csvLines[i]);
        continue;
      }

      if (entries[0] == "") {
        xirrValues[date] = entries[8];
      } else {
        // remove second elem which is mfCode
        var mfCode = parseInt(entries.splice(0, 1), 10);
        if (!mfCodes.includes(mfCode)) {
          mfCodes.push(mfCode);
        }

        if (mfValues[date] === undefined) {
          mfValues[date] = {};
        }
        mfValues[date][mfCode] = entries;
      }

      // get earliest date
      if (date.isBefore(startDate)) {
        startDate = date;
      }
    }
  }

  return [mfValues, xirrValues, startDate, mfCodes];
}

function addChart(portfolioData) {
  var mfValues = portfolioData[0];
  var xirrValues = portfolioData[1];
  var startDate = portfolioData[2];
  var endDate = moment(); // now

  var mfCodes = portfolioData[3];
  console.log("Adding chart for " + mfCodes.length + " MFs");

  // list of charts
  var portfolioCharts = [];
  var xirrChart = {
    label: "XIRR",
    data: [],
    yAxisID: "XIRR",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderColor: "rgba(0, 0, 0, 0.5)",
    borderWidth: 2,
    //borderDash: [2, 2],
    fill: false,
    pointRadius: 0,
    // tooltip sensitivity
    pointHitRadius: 5,
  };

  // https://jiffyclub.github.io/palettable/colorbrewer/qualitative/
  chartColors =
    chroma.
    //scale("Accent").
    //scale("Dark2").
    scale("Paired").
    //scale("Set1").
    //scale("Set2").
    //scale("Set3").
    //mode("rgb").
    //mode("lab").
    //mode("lrgb").
    //mode("lch").
    mode("hsl").
    colors(mfCodes.length);

  addLabels(startDate, endDate);

  for (var i in mfCodes) {
    var hexColor = getChartColor(portfolioCharts);
    // order is same as mfCodes
    portfolioCharts.push(GetPortfolioDataset(mfCodes[i], hexColor));
  }

  // iterate by date
  for (var i = 0; i < portfolioConfig.data.labels.length; i++) {
    var date = moment(portfolioConfig.data.labels[i], "DD MMM YYYY");
    var allMfVal = mfValues[date];

    if (allMfVal === undefined) {
      console.log("No data at " + date.format("YYYY-MM-DD"));
      continue;
    }

    // iterate per mf code
    for (var j in mfCodes) {
      var mfCode = mfCodes[j];

      if (allMfVal[mfCode] === undefined) {
        portfolioCharts[j].data.push(null);
        continue;
      }

      var currentValue = parseFloat(allMfVal[mfCode][6]);

      if (currentValue == null || isNaN(currentValue)) {
        portfolioCharts[j].data.push(null);
        continue;
      }

      portfolioCharts[j].data.push(currentValue);
    }

    // cap XIRR at 30%
    if (xirrValues[date] == undefined) {
      xirrChart.data.push(null);
    } else if (xirrValues[date] > 30) {
      xirrChart.data.push(30);
    } else {
      xirrChart.data.push(xirrValues[date]);
    }
  }

  // push order determines draw Z order
  portfolioConfig.data.datasets.push(xirrChart);
  for (var k in portfolioCharts) {
    portfolioConfig.data.datasets.push(portfolioCharts[k]);
  }

  portfolioChart.update();
}

function addLabels(startDate, endDate) {
  // empty labels
  portfolioConfig.data.labels = [];
  // clone is needed else startDate is modified on add() below
  var currDate = startDate.clone();

  while (currDate.isSameOrBefore(endDate)) {
    portfolioConfig.data.labels.push(currDate.format("DD MMM YYYY"));
    currDate.add(7, "days");
  }
}

function GetPortfolioDataset(mfCode, hexColor) {

  var currentValueDataset = {
    label: mfCode,
    data: [],
    yAxisID: "VAL",
    backgroundColor: getAlphaColor(hexColor, 1),
    borderColor: getAlphaColor(hexColor, 1),
    borderWidth: 2,
    //borderDash: [2, 2],
    fill: true,
    pointRadius: 0,
    // tooltip sensitivity
    pointHitRadius: 5,
    // custom data
    mfCode: mfCode,
    mfColor: hexColor
  }

  return currentValueDataset;
}

function getChartColor(portfolioCharts) {
  for (var  i = 0; i < chartColors.length; i++) {
    var colorAlreadyUsed = false;
    for (var k in portfolioCharts) {
      if (chartColors[i] == portfolioCharts[k].mfColor) {
        colorAlreadyUsed = true;
        break;
      }
    }
    if (!colorAlreadyUsed) {

      return chartColors[i];
    }
  }

  console.log("Out of color!");
  return chroma("black");
}

function getAlphaColor(hexColor, alpha) {
  var color = "rgba(" +
    chroma(hexColor).get('rgb.r') + "," +
    chroma(hexColor).get('rgb.g') + "," +
    chroma(hexColor).get('rgb.b') + "," +
    alpha + ")";

  return color;
}

