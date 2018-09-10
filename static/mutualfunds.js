"use strict";

function getChartColor() {
  // https://gka.github.io/chroma.js/
  // https://codepen.io/stevepepple/post/color-scales-for-charts-and-maps
  // https://jiffyclub.github.io/palettable/colorbrewer/qualitative/
  if (chartColors === undefined) {
    chartColors =
      chroma.
      //scale("Accent").
      scale("Dark2").
      //scale("Paired").
      //scale("Set1").
      //scale("Set2").
      //scale("Set3").
      //mode("rgb").
      //mode("lab").
      //mode("lrgb").
      //mode("lch").
      mode("hsl").
      colors(maxCharts);
  }

  for (var  i = 0; i < chartColors.length; i++) {
    var colorAlreadyUsed = false;
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

function getAlphaColor(hexColor, alpha) {
  var color = "rgba(" +
    chroma(hexColor).get('rgb.r') + "," +
    chroma(hexColor).get('rgb.g') + "," +
    chroma(hexColor).get('rgb.b') + "," +
    alpha + ")";

  return color;
}

function addLabels(chartConfig, startDate, endDate, periodicity) {
  // empty labels
  chartConfig.data.labels = [];
  // clone is needed else startDate is modified on add() below
  var currDate = startDate.clone();
  console.log("Setting labels from " + startDate.format() +
              " to " + endDate.format() +
              " with periodicity " + periodicity);

  while (currDate.isSameOrBefore(endDate)) {
    chartConfig.data.labels.push(currDate.format("DD MMM YYYY"));
    currDate.add(periodicity, "days");
  }
}

function getChart(mfCode, hiddenCharts, mfColor) {
  readTextFile(mfCode, "/static/csv/" + mfCode + ".csv", hiddenCharts, mfColor);
}

function readTextFile(mfCode, url, hiddenCharts, mfColor) {
  // read text from URL location
  console.log("Reading " + url);
  var req = new XMLHttpRequest();
  req.open("GET", url, true);
  req.send();

  req.onreadystatechange = function() {
    // file is downloaded
    if (req.readyState === XMLHttpRequest.DONE) {
      addChart(mfCode, req.responseText, hiddenCharts, mfColor);
    }
  }
}

function readCsv(csvData) {
  // read all csv entries to a dict
  var csvLines = csvData.split(/\r?\n/);
  // remove last empty element
  csvLines.splice(-1);
  // date (YYYY-MM-DD) vs csv data
  var csvValues = {};
  for (var i = 0; i < csvLines.length; i++) {
    var entries = csvLines[i].split(",");
    if (entries.length > 1) {
      // remove first elem and put in as date
      var date = entries.splice(0, 1);
      csvValues[date] = entries;
    }
  }

  return csvValues;
}

function addChart(mfCode, csvData, hiddenCharts, mfColor) {
  console.log("Adding chart " + mfCode);

  var hexColor;
  if (mfColor === null) {
    hexColor = getChartColor();
  } else {
    hexColor = mfColor;
  }

  // https://www.chartjs.org/docs/latest/charts/line.html
  // https://stackoverflow.com/questions/38085352/
  // how-to-use-two-y-axes-in-chart-js-v2
  var navDataset = {
    label: mfCode + " - Nav",
    data: [],
    yAxisID: "NAV",
    backgroundColor: getAlphaColor(hexColor, 0.2),
    borderColor: getAlphaColor(hexColor, 0.2),
    borderWidth: 2,
    //borderDash: [2, 2],
    fill: false,
    pointRadius: 0,
    // tooltip sensitivity
    pointHitRadius: 5,
    // custom data
    mfCode: mfCode,
    mfColor: hexColor,
    mfType: "NAV"
  }

  var avgNavDataset = {
    label: mfCode + " - 1 Mnth Avg Nav",
    data: [],
    yAxisID: "NAV",
    backgroundColor: getAlphaColor(hexColor, 0.6),
    borderColor: getAlphaColor(hexColor, 0.6),
    borderWidth: 2,
    //borderDash: [2, 2],
    fill: false,
    pointRadius: 0,
    // tooltip sensitivity
    pointHitRadius: 5,
    // custom data
    mfCode: mfCode,
    mfColor: hexColor,
    mfType: "AVG_NAV"
  }

  var retDataset = {
    label: mfCode + " - 3 Yr Cagr",
    data: [],
    yAxisID: "RET",
    backgroundColor: getAlphaColor(hexColor, 0.6),
    borderColor: getAlphaColor(hexColor, 0.6),
    borderWidth: 2,
    //borderDash: [2, 2],
    fill: false,
    pointRadius: 0,
    // tooltip sensitivity
    pointHitRadius: 5,
    mfCode: mfCode,
    mfColor: hexColor,
    mfType: "RET"
  }

  var retVarDataset = {
    label: mfCode + " - Std Dev",
    data: [],
    yAxisID: "RET",
    backgroundColor: getAlphaColor(hexColor, 0.2),
    borderColor: getAlphaColor(hexColor, 0.2),
    borderWidth: 2,
    //borderDash: [2, 2],
    fill: true,
    pointRadius: 0,
    // tooltip sensitivity
    pointHitRadius: 5,
    mfCode: mfCode,
    mfColor: hexColor,
    mfType: "RET_VAR"
  }

  for (var i = 0; i < hiddenCharts.length; i++) {
    if (hiddenCharts[i] == navDataset.mfType) {
      navDataset.hidden = true;
    } else if (hiddenCharts[i] == avgNavDataset.mfType) {
      avgNavDataset.hidden = true;
    } else if (hiddenCharts[i] == retDataset.mfType) {
      retDataset.hidden = true;
    } else if (hiddenCharts[i] == retVarDataset.mfType) {
      retVarDataset.hidden = true;
    } else {
      console.log("Unknown hidden type " + hiddenCharts[i]);
    }
  }

  var mfValues = readCsv(csvData);

  // get values for the relevant time markers
  for (var i = 0; i < navConfig.data.labels.length; i++) {
    var date = moment(navConfig.data.labels[i], "DD MMM YYYY");
    var mfVal = mfValues[date.format("YYYY-MM-DD")];

    if (mfVal !== undefined) {
      // nav value
      if (mfVal[0] !== undefined && mfVal[0].length > 0) {
        navDataset.data.push(mfVal[0]);
      } else {
        navDataset.data.push(null);
      }
      // one month nav value average
      if (mfVal[1] !== undefined && mfVal[1].length > 0) {
        avgNavDataset.data.push(mfVal[1]);
      } else {
        avgNavDataset.data.push(null);
      }
    } else {
      navDataset.data.push(null);
      avgNavDataset.data.push(null);
    }
  }

  for (var i = 0; i < retConfig.data.labels.length; i++) {
    var date = moment(retConfig.data.labels[i], "DD MMM YYYY");
    var mfVal = mfValues[date.format("YYYY-MM-DD")];

    if (mfVal !== undefined) {
      // three year cagr
      if (mfVal[3] !== undefined && mfVal[3].length > 0) {
        retDataset.data.push(mfVal[3]);
      } else {
        retDataset.data.push(null);
      }
      // two year standard deviation of one year cagr
      if (mfVal[5] !== undefined && mfVal[5].length > 0) {
        retVarDataset.data.push(mfVal[5]);
      } else {
        retVarDataset.data.push(null);
      }
    } else {
      retDataset.data.push(null);
      retVarDataset.data.push(null);
    }
  }

  navConfig.data.datasets.push(navDataset);
  navConfig.data.datasets.push(avgNavDataset);
  retConfig.data.datasets.push(retDataset);
  retConfig.data.datasets.push(retVarDataset);

  console.log("Total NAV datasets " + navConfig.data.datasets.length);
  console.log(navConfig);
  console.log("Total RET datasets " + retConfig.data.datasets.length);
  console.log(retConfig);

  navChart.update();
  retChart.update();

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

  var j = retConfig.data.datasets.length;
  while (j--) {
    if (retConfig.data.datasets[j].mfCode == mfCode) {
      // remove the element
      retConfig.data.datasets.splice(j, 1);
    }
  }

  console.log("Total NAV datasets " + navConfig.data.datasets.length);
  console.log("Total RET datasets " + retConfig.data.datasets.length);

  navChart.update();
  retChart.update();
}

function addButton(mfCode, textColor) {
  if (document.getElementById("btn" + mfCode) != null) {
    // button exists
    document.getElementById("btn" + mfCode).style.color = textColor;
    return;
  }

  var btn = document.createElement("button");
  var txt = document.createTextNode(mfCode + " - " + getNavLabel(mfCode));

  btn.appendChild(txt);
  btn.setAttribute("id", "btn" + mfCode);

  // bootstrap css
  btn.setAttribute("class", "btn btn-default btn-block");
  btn.setAttribute("style", "white-space: normal; margin-top: 1em; " +
                            "font-weight: bolder !important; " +
                            "color: " + textColor);

  document.getElementById("divMfList").appendChild(btn);

  btn.addEventListener("click", function() {
    removeChart(mfCode);
    document.getElementById("divMfList").removeChild(this);
  }, false);
}

function getNavLabel(mfCode) {
  if (mfLabelLookup === undefined) {
    mfLabelLookup = {};
    for (var i = 0; i < mf_name_codes.length; i++) {
      mfLabelLookup[mf_name_codes[i].mfcode] = mf_name_codes[i].label;
    }
  }
  return mfLabelLookup[mfCode];
}

function mfAutocompleteCb(ui) {
  if (navConfig.data.datasets.length >= (maxCharts * 2) ||
      retConfig.data.datasets.length >= (maxCharts * 2)) {
    return;
  }

  for (var i = 0; i < navConfig.data.datasets.length; i++) {
    if (navConfig.data.datasets[i].mfCode == ui.item.mfcode) {
      // element already exists
      return;
    }

    // keep current hidden status even after adding a new chart
    navConfig.data.datasets[i].hidden = !navChart.isDatasetVisible(i);
  }

  for (var i = 0; i < retConfig.data.datasets.length; i++) {
    if (retConfig.data.datasets[i].mfCode == ui.item.mfcode) {
      // element already exists
      return;
    }

    // keep current hidden status even after adding a new chart
    retConfig.data.datasets[i].hidden = !retChart.isDatasetVisible(i);
  }

  getChart(ui.item.mfcode, [], null);
}

function chartDateChangeCb() {
  var startDate = moment($("#inputMfStartDate").datepicker("getDate"));
  var endDate = moment($("#inputMfEndDate").datepicker("getDate"));

  if (startDate.isAfter(endDate)) {
    return;
  }

  var mfCodes = [];
  // mf code vs array of y axis ids
  var hiddenMfCodes = {};
  // mf code vs color
  var mfColors = {};

  for (var i = 0; i < navConfig.data.datasets.length; i++) {
    var mfCode = navConfig.data.datasets[i].mfCode;

    if (mfCodes.includes(mfCode) === false) {
      mfCodes.push(mfCode);
    }

    if (hiddenMfCodes[mfCode] === undefined) {
      hiddenMfCodes[mfCode] = [];
    }

    if (navChart.isDatasetVisible(i) === false) {
      hiddenMfCodes[mfCode].push(navConfig.data.datasets[i].mfType);
    }

    mfColors[mfCode] = navConfig.data.datasets[i].mfColor;
  }

  for (var i = 0; i < retConfig.data.datasets.length; i++) {
    var mfCode = retConfig.data.datasets[i].mfCode;

    if (mfCodes.includes(mfCode) === false) {
      mfCodes.push(mfCode);
    }

    if (hiddenMfCodes[mfCode] === undefined) {
      hiddenMfCodes[mfCode] = [];
    }

    if (retChart.isDatasetVisible(i) === false) {
      hiddenMfCodes[mfCode].push(retConfig.data.datasets[i].mfType);
    }
  }

  // clear existing chart datasets
  navConfig.data.datasets = [];
  retConfig.data.datasets = [];

  addLabels(navConfig, startDate, endDate, getPeriodicity(startDate, endDate));
  addLabels(retConfig, startDate, endDate, getPeriodicity(startDate, endDate));

  for (var i = 0; i < mfCodes.length; i++) {
    getChart(mfCodes[i], hiddenMfCodes[mfCodes[i]], mfColors[mfCodes[i]]);
  }
}

function getPeriodicity(startDate, endDate) {
  // there should be only upto 200 data points regardless of the given span
  var spanDays = endDate.diff(startDate, "days");
  return Math.max(1, Math.ceil(spanDays/200));
}

function updateMfDate(years) {
  // "years" earlier
  $("#inputMfStartDate").datepicker("setDate",
    moment().startOf("day").subtract(years, "years").format("DD MMM YYYY"));
  // today
  $("#inputMfEndDate").datepicker("setDate",
    moment().startOf("day").format("DD MMM YYYY"));
  chartDateChangeCb();
}

// ------------------------------------------------------------------ //

var maxCharts = 10;

var navConfig;
var navChart;

var retConfig;
var retChart;

var mfLabelLookup;

// month is 0 indexed
var defStartDate = moment({ year: 2006, month: 3, day: 1 });
var defEndDate = moment().startOf("day");

var chartColors;

$(function() {
  // https://jqueryui.com/autocomplete/
  $("#inputMfSearch").autocomplete({
    //source: mf_name_codes,
    //delay: 300,
    //minLength: 2,
    source: function(request, response) {
      var terms = request.term.split(" ");
      var results = [];
      // use each term to narrow down the results
      for (var i = 0; i < terms.length; i++) {
        if (terms[i].length > 0) {
          if (results.length == 0) {
            results = $.ui.autocomplete.filter(mf_name_codes, terms[i]);
          } else {
            results = $.ui.autocomplete.filter(results, terms[i]);
          }
        }
      }
      // pick only top 50 results to avoid slowing down the browser
      // delegate back to autocomplete
      response(results.slice(0, 50));
    },
    select: function(event, ui) {
      mfAutocompleteCb(ui);
      this.value = "";
      return false;
    }
  });

  // https://jqueryui.com/datepicker/
  $("#inputMfStartDate").datepicker({
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
  $("#inputMfStartDate").val(defStartDate.format("DD MMM YYYY"));
  $("#inputMfStartDate").change(function() {
    chartDateChangeCb();
  });

  $("#inputMfEndDate").datepicker({
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
  $("#inputMfEndDate").val(defEndDate.format("DD MMM YYYY"),);
  $("#inputMfEndDate").change(function() {
    chartDateChangeCb();
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
            labelString: "Value"
          }
        }]
      }
    }
  };

  retConfig =  {
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
          id: "RET",
          position: "left",
          type: "linear",
          ticks: {
            suggestedMin: 0,
          },
          scaleLabel: {
            display: true,
            labelString: "Percentage"
          }
        }]//,{
        //  id: "THREE_YR_STD_DEV",
        //  position: "right",
        //  type: "linear",
        //  ticks: {
        //    suggestedMin: 0,
        //  },
        //  scaleLabel: {
        //    display: true,
        //    labelString: "3 Year Standard Deviation"
        //  }
        //}]
      }
    }
  };

  updateMfDate(5);

  navChart = new Chart(document.getElementById("canvasNavChart"), navConfig);
  retChart = new Chart(document.getElementById("canvasRetChart"), retConfig);

  getChart("113177", [], null);
  getChart("130502", [], null);
  getChart("125494", [], null);
  getChart("100822", [], null);

  // Serialize URL
  // https://gka.github.io/palettes/
});

