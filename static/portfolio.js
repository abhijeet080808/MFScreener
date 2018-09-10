"use strict";

var mfLabelLookup;

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
        display: false,
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
            suggestedMin: -30,
            suggestedMax: 30,
          },
          scaleLabel: {
            display: true,
            labelString: "XIRR"
          }
        }]
      }
    }
  };

  portfolioChart = new Chart(document.getElementById("canvasPortfolioChart"),
                             portfolioConfig);

  mfLabelLookup = {};
  for (var i = 0; i < mf_name_codes.length; i++) {
    mfLabelLookup[parseInt(mf_name_codes[i].mfcode, 10)] =
      mf_name_codes[i].label;
  }

  readCsvFile("/static/csv/transactions.csv");
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

    addButton(mfCodes[i], hexColor, i);
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
        portfolioCharts[j][0].data.push(null);
        portfolioCharts[j][1].data.push(null);
        continue;
      }

      var currentValue = parseFloat(allMfVal[mfCode][6]);

      if (currentValue == null || isNaN(currentValue)) {
        portfolioCharts[j][0].data.push(null);
      } else {
        portfolioCharts[j][0].data.push(currentValue);
      }

      var currentXirr = parseFloat(allMfVal[mfCode][7]);

      if (currentXirr == null || isNaN(currentXirr)) {
        portfolioCharts[j][1].data.push(null);
      } else {
        // cap XIRR at 30%
        if (currentXirr > 30) {
          currentXirr = 30;
        } else if (currentXirr < -30) {
          currentXirr = -30;
        }
        portfolioCharts[j][1].data.push(currentXirr);
      }
    }

    // cap XIRR at 30%
    if (xirrValues[date] == undefined) {
      xirrChart.data.push(null);
    } else if (xirrValues[date] > 30) {
      xirrChart.data.push(30);
    } else if (xirrValues[date] < -30) {
      xirrChart.data.push(-30);
    } else {
      xirrChart.data.push(xirrValues[date]);
    }
  }

  // push order determines draw Z order
  portfolioConfig.data.datasets.push(xirrChart);
  for (var k in portfolioCharts) {
    portfolioConfig.data.datasets.push(portfolioCharts[k][0]);
    portfolioConfig.data.datasets.push(portfolioCharts[k][1]);
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
    label: mfCode + " - Value",
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

  var currentXirrDataset = {
    label: mfCode + " - XIRR",
    data: [],
    yAxisID: "XIRR",
    backgroundColor: getAlphaColor(hexColor, 1),
    borderColor: getAlphaColor(hexColor, 1),
    borderWidth: 2,
    //borderDash: [2, 2],
    fill: false,
    pointRadius: 0,
    // tooltip sensitivity
    pointHitRadius: 5,
    // custom data
    mfCode: mfCode,
    mfColor: hexColor
  }

  return [currentValueDataset, currentXirrDataset];
}

function getChartColor(portfolioCharts) {
  for (var  i = 0; i < chartColors.length; i++) {
    var colorAlreadyUsed = false;
    for (var k in portfolioCharts) {
      if (chartColors[i] == portfolioCharts[k][0].mfColor) {
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

function addButton(mfCode, textColor, btnNumber) {

  // even button number
  if (btnNumber % 2 == 0) {
    var div = document.createElement("div");
    div.setAttribute("id", "divBtn" + btnNumber/2);
    div.setAttribute("class", "row");
    document.getElementById("divButtons").appendChild(div);

    var col1 = document.createElement("div");
    col1.setAttribute("id", "divBtn" + btnNumber/2 + "Col" + 0);
    col1.setAttribute("class", "col-md-6");
    col1.setAttribute("style", "padding: 0 !important;");
    div.appendChild(col1);

    var col2 = document.createElement("div");
    col2.setAttribute("id", "divBtn" + btnNumber/2 + "Col" + 1);
    col2.setAttribute("class", "col-md-6");
    col2.setAttribute("style", "padding: 0 !important;");
    div.appendChild(col2);
  }

  var btn1 = getMfButton(mfCode, textColor);
  var btn2 = getToggleButton(mfCode, "Value" + mfCode, "Value", "VAL");
  var btn3 = getToggleButton(mfCode, "Xirr" + mfCode, "XIRR", "XIRR");

  if (btnNumber % 2 == 0) {
    var div = "divBtn" + Math.floor(btnNumber/2) + "Col" + 0;
    document.getElementById(div).appendChild(btn1);
    document.getElementById(div).appendChild(btn2);
    document.getElementById(div).appendChild(btn3);
  } else {
    var div = "divBtn" + Math.floor(btnNumber/2) + "Col" + 1;
    document.getElementById(div).appendChild(btn1);
    document.getElementById(div).appendChild(btn2);
    document.getElementById(div).appendChild(btn3);
  }
}

function getMfButton(mfCode, textColor) {
  var btn = document.createElement("button");
  var txt = document.createTextNode(mfLabelLookup[mfCode]);

  btn.appendChild(txt);
  btn.setAttribute("id", "btnMf" + mfCode);

  // bootstrap css
  btn.setAttribute("class", "btn btn-default btn-block");
  btn.setAttribute("style", "white-space: nowrap; margin-top: 1em; " +
                            "font-weight: bolder !important; " +
                            "color: " + textColor + "; " +
                            "outline: 0 none; " +
                            "overflow: hidden; text-overflow: ellipsis; ");

  var div = document.createElement("div");
  div.setAttribute("class", "col-md-8");
  div.appendChild(btn);

  btn.addEventListener("click", function() {
    // show all charts for this mf code
    for (var i = 0; i < portfolioConfig.data.datasets.length; i++) {
      if (portfolioConfig.data.datasets[i].mfCode == mfCode) {
        portfolioConfig.data.datasets[i].hidden = false;
      }
    }

    $(document.getElementById("btnToggleValue" + mfCode)).addClass("active");
    $(document.getElementById("btnToggleXirr" + mfCode)).addClass("active");

    portfolioChart.update();
  }, false);

  return div;
}

function getToggleButton(mfCode, name, text, yAxisID) {
  var btn = document.createElement("button");
  var txt = document.createTextNode(text);

  btn.appendChild(txt);
  btn.setAttribute("id", "btnToggle" + name);

  // bootstrap css
  btn.setAttribute("class", "btn btn-default btn-block active");
  btn.setAttribute("style", "white-space: nowrap; margin-top: 1em; " +
                            "outline: 0 none; " +
                            "overflow: hidden; text-overflow: ellipsis; ");

  var div = document.createElement("div");
  div.setAttribute("class", "col-md-2");
  div.appendChild(btn);

  btn.addEventListener("click", function() {
    // hide relevant charts for this mf code
    for (var i = 0; i < portfolioConfig.data.datasets.length; i++) {
      if (portfolioConfig.data.datasets[i].mfCode == mfCode &&
          portfolioConfig.data.datasets[i].yAxisID == yAxisID) {
        portfolioConfig.data.datasets[i].hidden =
          portfolioChart.isDatasetVisible(i);
      }
    }

    $(document.getElementById("btnToggle" + name)).toggleClass("active");
    //this.blur(); // remove focus from this button or use "outline: 0 none;"

    portfolioChart.update();
  }, false);

  return div;
}

function showAllValues() {
  for (var i = 0; i < portfolioConfig.data.datasets.length; i++) {
    if (portfolioConfig.data.datasets[i].yAxisID == "VAL") {
      portfolioConfig.data.datasets[i].hidden = false;
    }
  }
  portfolioChart.update();

  // update state of all buttons
  for (var i = 0;
       i < document.getElementById("divButtons").children.length;
       i++) {
    var row = document.getElementById("divButtons").children[i];
    var col1 = document.getElementById("divBtn" + i + "Col0");
    var col2 = document.getElementById("divBtn" + i + "Col1");

    if (col1.children.length == 0) {
      continue;
    }

    var valBtn1 = col1.children[1].children[0];
    $(valBtn1).addClass("active");

    if (col2.children.length == 0) {
      continue;
    }

    var valBtn2 = col2.children[1].children[0];
    $(valBtn2).addClass("active");
  }
}

function hideAllValues() {
  for (var i = 0; i < portfolioConfig.data.datasets.length; i++) {
    if (portfolioConfig.data.datasets[i].yAxisID == "VAL") {
      portfolioConfig.data.datasets[i].hidden = true;
    }
  }
  portfolioChart.update();

  // update state of all buttons
  for (var i = 0;
       i < document.getElementById("divButtons").children.length;
       i++) {
    var row = document.getElementById("divButtons").children[i];
    var col1 = document.getElementById("divBtn" + i + "Col0");
    var col2 = document.getElementById("divBtn" + i + "Col1");

    if (col1.children.length == 0) {
      continue;
    }

    var valBtn1 = col1.children[1].children[0];
    $(valBtn1).removeClass("active");

    if (col2.children.length == 0) {
      continue;
    }

    var valBtn2 = col2.children[1].children[0];
    $(valBtn2).removeClass("active");
  }
}

function showAllXirrs() {
  for (var i = 0; i < portfolioConfig.data.datasets.length; i++) {
    if (portfolioConfig.data.datasets[i].yAxisID == "XIRR") {
      portfolioConfig.data.datasets[i].hidden = false;
    }
  }
  portfolioChart.update();

  // update state of all buttons
  for (var i = 0;
       i < document.getElementById("divButtons").children.length;
       i++) {
    var row = document.getElementById("divButtons").children[i];
    var col1 = document.getElementById("divBtn" + i + "Col0");
    var col2 = document.getElementById("divBtn" + i + "Col1");

    if (col1.children.length == 0) {
      continue;
    }

    var valBtn1 = col1.children[2].children[0];
    $(valBtn1).addClass("active");

    if (col2.children.length == 0) {
      continue;
    }

    var valBtn2 = col2.children[2].children[0];
    $(valBtn2).addClass("active");
  }
}

function hideAllXirrs() {
  for (var i = 0; i < portfolioConfig.data.datasets.length; i++) {
    if (portfolioConfig.data.datasets[i].mfCode !== undefined &&
        portfolioConfig.data.datasets[i].yAxisID == "XIRR") {
      portfolioConfig.data.datasets[i].hidden = true;
    }
  }
  portfolioChart.update();

  // update state of all buttons
  for (var i = 0;
       i < document.getElementById("divButtons").children.length;
       i++) {
    var row = document.getElementById("divButtons").children[i];
    var col1 = document.getElementById("divBtn" + i + "Col0");
    var col2 = document.getElementById("divBtn" + i + "Col1");

    if (col1.children.length == 0) {
      continue;
    }

    var valBtn1 = col1.children[2].children[0];
    $(valBtn1).removeClass("active");

    if (col2.children.length == 0) {
      continue;
    }

    var valBtn2 = col2.children[2].children[0];
    $(valBtn2).removeClass("active");
  }
}
