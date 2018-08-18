function addDailyLabels() {
  // month is 0 indexed
  var start_date = moment({ year: 2006, month: 3, day: 1 });
  var end_date = moment().startOf("day");
  console.log("Setting labels from " + start_date.format() + " to " + end_date.format());

  var curr_date = start_date;
  // empty labels
  navConfig.data.labels = [];

  while (curr_date.isSameOrBefore(end_date)) {
    navConfig.data.labels.push(curr_date.format("DD MMM YYYY"));
    curr_date = curr_date.add(1, "days");
  }
}

function addWeeklyLabels() {
  // month is 0 indexed
  var start_date = moment({ year: 2006, month: 3, day: 1 });
  var end_date = moment().startOf("day").day("Sunday"); // last sunday
  console.log("Setting labels from " + start_date.format() + " to " + end_date.format());

  var curr_date = start_date;
  // empty labels
  navConfig.data.labels = [];

  while (curr_date.isSameOrBefore(end_date)) {
    navConfig.data.labels.push(curr_date.format("DD MMM YYYY"));
    curr_date.add(1, "weeks");
  }
}

function addMonthlyLabels() {
  // month is 0 indexed
  var start_date = moment({ year: 2006, month: 3, day: 1 });
  var end_date = moment().startOf("day").date(1); // first day of this month
  console.log("Setting labels from " + start_date.format() + " to " + end_date.format());

  var curr_date = start_date;
  // empty labels
  navConfig.data.labels = [];

  while (curr_date.isSameOrBefore(end_date)) {
    navConfig.data.labels.push(curr_date.format("DD MMM YYYY"));
    curr_date.add(1, "months");
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
    var entries = csvLines[i].split(',');
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
  for (var index in navConfig.data.datasets) {
    if (navConfig.data.datasets[index].mfCode == mfCode) {
      // remove the element
      console.log("Removing chart " + mfCode);
      navConfig.data.datasets.splice(index, 1);
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

  btn.addEventListener('click', function() {
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
  for (var index in navConfig.data.datasets) {
    if (navConfig.data.datasets[index].mfCode == ui.item.mfcode) {
      // element already exists
      return;
    }
  }
  addNav(ui.item.mfcode, ui.item.label);
}

var navConfig;
var navChart;
var mfLabelLookup;

$(function() {
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

  // http://www.chartjs.org/samples/latest/charts/line/basic.html
  navConfig =  {
    type: 'line',
    data: {
      labels: [],
      datasets: []
    }
  };

  //addDailyLabels();
  //addWeeklyLabels();
  addMonthlyLabels();

  navChart = new Chart(document.getElementById("canvasNavChart"), navConfig);

  addNav("113177", getNavLabel("113177"));
  addNav("130502", getNavLabel("130502"));
  addNav("125494", getNavLabel("125494"));
});

