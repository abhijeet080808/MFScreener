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
    if (req.readyState == XMLHttpRequest.DONE) {
      addChart(mfCode, req.responseText);
    }
  }
}

function dynamicColors() {
  var h = Math.floor(Math.random() * 255);
  var s = (Math.floor(Math.random() * 40) + 30) + "%";
  var l = (Math.floor(Math.random() * 40) + 30) + "%";
  return "hsl(" + h + "," + s + "," + l + ")";
}

function addChart(mfCode, csvData) {
  console.log("Adding chart " + mfCode);

  // https://www.chartjs.org/docs/latest/charts/line.html
  var color = dynamicColors();
  var dataset = {
    label: mfCode,
    data: [],
    backgroundColor: color,
    borderColor: color,
    fill: false,
    pointRadius: 0,
    pointHitRadius: 5,
    mfCode: mfCode
  }

  // read all csv entries to a dict
  var csvLines = csvData.split(/\r\n|\n/);
  // remove last empty element
  csvLines.splice(-1);
  // date (YYYY-MM-DD) vs value
  var navValues = {};
  for (var i = 0; i < csvLines.length; i++) {
    var entries = csvLines[i].split(",");
    navValues[entries[0]] = entries[1];
  }

  // get values for the relevant time markers
  for (var i = 0; i < navConfig.data.labels.length; i++) {
    var date = moment(navConfig.data.labels[i], "DD MMM YYYY");
    dataset.data.push(navValues[date.format("YYYY-MM-DD")]);
  }

  navConfig.data.datasets.push(dataset);
  navChart.update();
}

function removeChart(mfCode) {
  for (var i = 0; i < navConfig.data.datasets.length; i++) {
    if (navConfig.data.datasets[i].mfCode == mfCode) {
      // remove the element
      console.log("Removing chart " + mfCode);
      navConfig.data.datasets.splice(i, 1);
    }
  }
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
  if (mfLabelLookup == null) {
    mfLabelLookup = {};
    for (var i = 0; i < mf_codes.length; i++) {
      mfLabelLookup[mf_codes[i].mfcode] = mf_codes[i].label;
    }
  }
  return mfLabelLookup[mfCode];
}

function navAutocompleteCb(ui) {
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
    currMfCodes.push(navConfig.data.datasets[i].mfCode);
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
  $("#inputNavStartDate").datepicker("setDate",
    moment().startOf("day").subtract(years, "years").format("DD MMM YYYY"));
  $("#inputNavEndDate").datepicker("setDate",
    moment().startOf("day").format("DD MMM YYYY"));
  navDateChangeCb();
}

// ------------------------------------------------------------------ //

var navConfig;
var navChart;
var mfLabelLookup;
// month is 0 indexed
var defStartDate = moment({ year: 2006, month: 3, day: 1 });
var defEndDate = moment().startOf("day");

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
      if(dateText !== instance.lastVal){
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
      if(dateText !== instance.lastVal){
        $(this).change();
      }
    }
  });
  $("#inputNavEndDate").val(defEndDate.format("DD MMM YYYY"),);
  $("#inputNavEndDate").change(function() {
    navDateChangeCb();
  });

  // http://www.chartjs.org/samples/latest/charts/line/basic.html
  navConfig =  {
    type: "line",
    data: {
      labels: [],
      datasets: []
    }
  };

  addLabels(defStartDate, defEndDate, getPeriodicity(defStartDate, defEndDate));

  navChart = new Chart(document.getElementById("canvasNavChart"), navConfig);

  addNav("113177", getNavLabel("113177"));
  addNav("130502", getNavLabel("130502"));
  addNav("125494", getNavLabel("125494"));
});

