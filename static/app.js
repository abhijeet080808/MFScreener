"use strict";

function getChartColor() {
  // https://gka.github.io/chroma.js/
  // https://codepen.io/stevepepple/post/color-scales-for-charts-and-maps
  // https://jiffyclub.github.io/palettable/colorbrewer/qualitative/
  if (chartColors === undefined) {
    chartColors =
      chroma.
      //scale("Accent").
      //scale("Set1").
      scale("Dark2").
      mode("lch").
      //mode("hsl").
      colors(maxCharts);
  }

  for (var  i = 0; i < chartColors.length; i++) {
    var colorAlreadyUsed = false
    for (var j = 0; j < navConfig.data.datasets.length; j++) {
      if (chartColors[i] == navConfig.data.datasets[j].mfColor) {
        colorAlreadyUsed = true;
        break;
      }
    }
    if (!colorAlreadyUsed) {
      return chartColors[i];
    }
  }

  return chroma("black");
}

function addLabels(startDate, endDate, periodicity) {
  // empty labels
  navConfig.data.labels = [];
  var currDate = startDate;
  console.log("Setting labels from " + currDate.format() +
              " to " + endDate.format() +
              " with periodicity " + periodicity);

  while (currDate.isSameOrBefore(endDate)) {
    navConfig.data.labels.push(currDate.format("DD MMM YYYY"));
    currDate.add(periodicity, "days");
  }
}

function getChart(mfCode, hiddenYAxes) {
  readTextFile(mfCode, "/static/csv/" + mfCode + ".csv", hiddenYAxes);
}

function readTextFile(mfCode, url, hiddenYAxes) {
  // read text from URL location
  console.log("Reading " + url);
  var req = new XMLHttpRequest();
  req.open("GET", url, true);
  req.send();

  req.onreadystatechange = function() {
    // file is downloaded
    if (req.readyState === XMLHttpRequest.DONE) {
      addChart(mfCode, req.responseText, hiddenYAxes);
    }
  }
}

function readCsv(csvData) {
  // read all csv entries to a dict
  var csvLines = csvData.split(/\r?\n/);
  // remove last empty element
  csvLines.splice(-1);
  // date (YYYY-MM-DD) vs
  // [nav, one year return, three year returns, five year returns]
  var mfValues = {};
  for (var i = 0; i < csvLines.length; i++) {
    var entries = csvLines[i].split(",");
    if (entries.length > 1) {
      // remove first elem and put in as date
      var date = entries.splice(0, 1);
      mfValues[date] = entries;
    }
  }

  return mfValues;
}

function addChart(mfCode, csvData, hiddenYAxes) {
  console.log("Adding chart " + mfCode);

  var mfValues = readCsv(csvData);
  var hexColor = getChartColor();
  var color1 = "rgba(" +
               chroma(hexColor).get('rgb.r') + "," +
               chroma(hexColor).get('rgb.g') + "," +
               chroma(hexColor).get('rgb.b') + "," +
               "0.2)";
  var color2 = "rgba(" +
               chroma(hexColor).get('rgb.r') + "," +
               chroma(hexColor).get('rgb.g') + "," +
               chroma(hexColor).get('rgb.b') + "," +
               "0.6)";

  // https://www.chartjs.org/docs/latest/charts/line.html
  // https://stackoverflow.com/questions/38085352/
  // how-to-use-two-y-axes-in-chart-js-v2
  var navDataset = {
    label: "NAV - " + mfCode,
    data: [],
    yAxisID: "NAV",
    backgroundColor: color1,
    borderColor: color1,
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

  var threeYrRetDataset = {
    label: "3 Yr Ret - " + mfCode,
    data: [],
    yAxisID: "THREE_YR_RET",
    backgroundColor: color2,
    borderColor: color2,
    borderWidth: 2,
    //borderDash: [2, 2],
    fill: false,
    pointRadius: 0,
    // tooltip sensitivity
    pointHitRadius: 5,
    mfCode: mfCode,
    mfColor: hexColor
  }

  for (var i = 0; i < hiddenYAxes.length; i++) {
    if (hiddenYAxes[i] == navDataset.yAxisID) {
      navDataset.hidden = true;
    } else {
      navDataset.hidden = false;
    }

    if (hiddenYAxes[i] == threeYrRetDataset.yAxisID) {
      threeYrRetDataset.hidden = true;
    } else {
      threeYrRetDataset.hidden = false;
    }
  }

  // get values for the relevant time markers
  for (var i = 0; i < navConfig.data.labels.length; i++) {
    var date = moment(navConfig.data.labels[i], "DD MMM YYYY");
    var mfVal = mfValues[date.format("YYYY-MM-DD")];

    if (mfVal !== undefined) {
      // add nav value if available
      if (mfVal[0] !== undefined && mfVal[0].length > 0) {
        navDataset.data.push(mfVal[0]);
      } else {
        navDataset.data.push(null);
      }
      // add three years return if available
      if (mfVal[2] !== undefined && mfVal[2].length > 0) {
        threeYrRetDataset.data.push(mfVal[2]);
      } else {
        threeYrRetDataset.data.push(null);
      }
    } else {
      navDataset.data.push(null);
      threeYrRetDataset.data.push(null);
    }
  }

  navConfig.data.datasets.push(navDataset);
  navConfig.data.datasets.push(threeYrRetDataset);

  console.log("Total datasets " + navConfig.data.datasets.length);
  navChart.update();
  addButton(mfCode, hexColor);
}

function removeChart(mfCode) {
  console.log("Removing chart " + mfCode);

  var i = navConfig.data.datasets.length;
  while (i--) {
    if (navConfig.data.datasets[i].mfCode == mfCode) {
      // remove the element
      navConfig.data.datasets.splice(i, 1);
    }
  }

  console.log("Total datasets " + navConfig.data.datasets.length);
  navChart.update();
}

function addButton(mfCode, textColor) {
  if (document.getElementById("btn" + mfCode) != null) {
    // button exists
    return;
  }

  var btn = document.createElement("button");
  var txt = document.createTextNode(mfCode + " - " + getNavLabel(mfCode));

  btn.appendChild(txt);
  btn.setAttribute("id", "btn" + mfCode);

  // bootstrap css
  btn.setAttribute("class", "btn btn-default btn-block");
  btn.setAttribute("style", "white-space: normal; margin-top: 1em; " +
                            "font-weight: bolder; color: " + textColor);

  document.getElementById("divNavList").appendChild(btn);

  btn.addEventListener("click", function() {
    removeChart(mfCode);
    document.getElementById("divNavList").removeChild(this);
  }, false);
}

function getNavLabel(mfCode) {
  if (mfLabelLookup === undefined) {
    mfLabelLookup = {};
    for (var i = 0; i < mf_codes.length; i++) {
      mfLabelLookup[mf_codes[i].mfcode] = mf_codes[i].label;
    }
  }
  return mfLabelLookup[mfCode];
}

function navAutocompleteCb(ui) {
  if (navConfig.data.datasets.length >= (maxCharts * 2)) {
    return;
  }

  var currHiddenMfCodes = {};
  for (var i = 0; i < navConfig.data.datasets.length; i++) {
    if (navConfig.data.datasets[i].mfCode == ui.item.mfcode) {
      // element already exists
      return;
    }

    // keep current hidden status even after adding a new chart
    navConfig.data.datasets[i].hidden = !navChart.isDatasetVisible(i);
  }

  getChart(ui.item.mfcode, []);
}

function navDateChangeCb() {
  var startDate = moment($("#inputNavStartDate").datepicker("getDate"));
  var endDate = moment($("#inputNavEndDate").datepicker("getDate"));

  if (startDate.isAfter(endDate)) {
    return;
  }

  var currMfCodes = [];
  // mf code vs array of y axis ids
  var currHiddenMfCodes = {};
  for (var i = 0; i < navConfig.data.datasets.length; i++) {
    var mfCode = navConfig.data.datasets[i].mfCode;
    if (currMfCodes.includes(mfCode) === false) {
      currMfCodes.push(mfCode);
    }

    if (currHiddenMfCodes[mfCode] === undefined) {
      currHiddenMfCodes[mfCode] = [];
    }

    if (navChart.isDatasetVisible(i) === false) {
      currHiddenMfCodes[mfCode].push(navConfig.data.datasets[i].yAxisID);
    }
  }

  // clear existing chart datasets
  navConfig.data.datasets = [];

  addLabels(startDate, endDate, getPeriodicity(startDate, endDate));

  for (var i = 0; i < currMfCodes.length; i++) {
    getChart(currMfCodes[i], currHiddenMfCodes[currMfCodes[i]]);
  }
}

function getPeriodicity(startDate, endDate) {
  // there should be only upto 200 data points regardless of the given span
  var spanDays = endDate.diff(startDate, "days");
  return Math.max(1, Math.ceil(spanDays/200));
}

function updateNavDate(years) {
  // "years" earlier
  $("#inputNavStartDate").datepicker("setDate",
    moment().startOf("day").subtract(years, "years").format("DD MMM YYYY"));
  // today
  $("#inputNavEndDate").datepicker("setDate",
    moment().startOf("day").format("DD MMM YYYY"));
  navDateChangeCb();
}

// ------------------------------------------------------------------ //

var maxCharts = 10;
var navConfig;
var navChart;
var mfLabelLookup;
// month is 0 indexed
var defStartDate = moment({ year: 2006, month: 3, day: 1 });
var defEndDate = moment().startOf("day");
var chartColors;

$(function() {
  // https://jqueryui.com/autocomplete/
  $("#inputNavSearch").autocomplete({
    source: mf_codes,
    delay: 300,
    minLength: 3,
    select: function(event, ui) {
      navAutocompleteCb(ui);
      this.value = "";
      return false;
    }
  });

  // https://jqueryui.com/datepicker/
  $("#inputNavStartDate").datepicker({
    changeMonth: true,
    changeYear: true,
    dateFormat: "dd M yy", // 01 Aug 2018
    minDate: defStartDate.format("DD MMM YYYY"),
    maxDate: defEndDate.format("DD MMM YYYY"),
    onSelect: function(dateText, instance) {
      if (dateText !== instance.lastVal) {
        $(this).change();
      }
    }
  });
  $("#inputNavStartDate").val(defStartDate.format("DD MMM YYYY"));
  $("#inputNavStartDate").change(function() {
    navDateChangeCb();
  });

  $("#inputNavEndDate").datepicker({
    changeMonth: true,
    changeYear: true,
    dateFormat: "dd M yy", // 01 Aug 2018
    minDate: defStartDate.format("DD MMM YYYY"),
    maxDate: defEndDate.format("DD MMM YYYY"),
    onSelect: function(dateText, instance) {
      if (dateText !== instance.lastVal) {
        $(this).change();
      }
    }
  });
  $("#inputNavEndDate").val(defEndDate.format("DD MMM YYYY"),);
  $("#inputNavEndDate").change(function() {
    navDateChangeCb();
  });

  // http://www.chartjs.org/samples/latest/charts/line/basic.html
  // http://www.chartjs.org/docs/latest/
  navConfig =  {
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
      scales: {
        yAxes: [{
          id: "NAV",
          position: "left",
          type: "linear",
          ticks: {
            suggestedMin: 0,
          },
          scaleLabel: {
            display: true,
            labelString: "NAV"
          }
        },{
          id: "THREE_YR_RET",
          position: "right",
          type: "linear",
          ticks: {
            suggestedMin: 0,
          },
          scaleLabel: {
            display: true,
            labelString: "3 Year Return"
          }
        }]
      }
    }
  };

  updateNavDate(5);

  navChart = new Chart(document.getElementById("canvasNavChart"), navConfig);

  getChart("113177", []);
  getChart("130502", []);
  getChart("125494", []);
  getChart("100822", []);

  // Serialize URL
  // https://gka.github.io/palettes/
});

