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
      if (chartColors[i] == navConfig.data.datasets[j].backgroundColor) {
        colorAlreadyUsed = true;
        break;
      }
    }
    if (!colorAlreadyUsed) {
      return chartColors[i];
    }
  }

  return chroma("black");

  //var h = Math.floor(Math.random() * 255);
  //var s = (Math.floor(Math.random() * 40) + 30) + "%";
  //var l = (Math.floor(Math.random() * 20) + 50) + "%";
  //return "hsl(" + h + "," + s + "," + l + ")";
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

function getChart(mfCode) {
  readTextFile(mfCode, "/static/csv/" + mfCode + ".csv");
}

function readTextFile(mfCode, url) {
  // read text from URL location
  console.log("Reading " + url);
  var req = new XMLHttpRequest();
  req.open("GET", url, true);
  req.send();

  req.onreadystatechange = function() {
    // file is downloaded
    if (req.readyState === XMLHttpRequest.DONE) {
      addChart(mfCode, req.responseText);
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

function addChart(mfCode, csvData) {
  console.log("Adding chart " + mfCode);

  var mfValues = readCsv(csvData);
  var color = getChartColor();

  // https://www.chartjs.org/docs/latest/charts/line.html
  // https://stackoverflow.com/questions/38085352/
  // how-to-use-two-y-axes-in-chart-js-v2
  var navDataset = {
    label: "NAV - " + mfCode,
    data: [],
    yAxisID: "NAV",
    backgroundColor: color,
    borderColor: color,
    borderWidth: 2,
    fill: false,
    pointRadius: 0,
    pointHitRadius: 5,
    mfCode: mfCode
  }

  var threeYrRetDataset = {
    label: "3 Yr Ret - " + mfCode,
    data: [],
    yAxisID: "THREE_YR_RET",
    backgroundColor: color,
    borderColor: color,
    borderWidth: 2,
    borderDash: [2, 2],
    fill: false,
    pointRadius: 0,
    pointHitRadius: 5,
    mfCode: mfCode
  }

  // get values for the relevant time markers
  for (var i = 0; i < navConfig.data.labels.length; i++) {
    var date = moment(navConfig.data.labels[i], "DD MMM YYYY");
    var mfVal = mfValues[date.format("YYYY-MM-DD")];

    if (mfVal !== undefined) {
      // add nav value if available
      if (mfVal[0] !== undefined && mfVal[0].length > 0) {
        navDataset.data.push(mfVal[0]);
      }
      else {
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

function addNav(mfCode, mfLabel) {
  var btn = document.createElement("button");
  var txt = document.createTextNode(mfCode + " - " + mfLabel);

  btn.appendChild(txt);
  btn.setAttribute("id", "btn" + mfLabel);

  // bootstrap css
  btn.setAttribute("class", "btn btn-default btn-block");
  btn.setAttribute("style", "white-space: normal; margin-top: 1em;");

  document.getElementById("divNavList").appendChild(btn);

  getChart(mfCode);

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
  if (navConfig.data.datasets.length >= maxCharts) {
    return;
  }

  for (var i = 0; i < navConfig.data.datasets.length; i++) {
    if (navConfig.data.datasets[i].mfCode == ui.item.mfcode) {
      // element already exists
      return;
    }
  }

  addNav(ui.item.mfcode, ui.item.label);
}

function navDateChangeCb() {
  var startDate = moment($("#inputNavStartDate").datepicker("getDate"));
  var endDate = moment($("#inputNavEndDate").datepicker("getDate"));

  if (startDate.isAfter(endDate)) {
    return;
  }

  var currMfCodes = [];
  for (var i = 0; i < navConfig.data.datasets.length; i++) {
    var mfCode = navConfig.data.datasets[i].mfCode;
    if (currMfCodes.includes(mfCode) === false) {
      currMfCodes.push(mfCode);
    }
  }

  // clear existing chart datasets
  navConfig.data.datasets = [];

  addLabels(startDate, endDate, getPeriodicity(startDate, endDate));

  for (var i = 0; i < currMfCodes.length; i++) {
    getChart(currMfCodes[i]);
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
        display: true,
        text: "NAV Chart"
      },
      legend: {
        position: "right"
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

  addNav("113177", getNavLabel("113177"));
  addNav("130502", getNavLabel("130502"));
  addNav("125494", getNavLabel("125494"));

  // Serialize URL
  // https://gka.github.io/palettes/
});

