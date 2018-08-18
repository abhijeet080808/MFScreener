function addDailyLabels() {
  // http://www.datejs.com
  var start_date = Date.parse("01-Apr-2006");
  var end_date = new Date().clearTime();
  console.log("Setting labels from " + start_date + " to " + end_date);

  var curr_date = start_date;
  // empty labels
  navConfig.data.labels = [];

  while (curr_date.compareTo(end_date) <= 0) {
    navConfig.data.labels.push(curr_date.toString("dd MMM yyyy"));
    curr_date = curr_date.add(1).day();
  }
}

function addWeeklyLabels() {
  // http://www.datejs.com
  var start_date = Date.parse("01-Apr-2006").next().sunday();
  var end_date = new Date().clearTime().last().sunday();
  console.log("Setting labels from " + start_date + " to " + end_date);

  var curr_date = start_date;
  // empty labels
  navConfig.data.labels = [];

  while (curr_date.compareTo(end_date) <= 0) {
    navConfig.data.labels.push(curr_date.toString("dd MMM yyyy"));
    curr_date = curr_date.add(1).week();
  }
}

function addMonthlyLabels() {
  // http://www.datejs.com
  var start_date = Date.parse("01-Apr-2006");
  var today = new Date().clearTime();
  var end_date = Date.parse("1 " + today.toString("MMM yyyy"));
  console.log("Setting labels from " + start_date + " to " + end_date);

  var curr_date = start_date;
  // empty labels
  navConfig.data.labels = [];

  while (curr_date.compareTo(end_date) <= 0) {
    navConfig.data.labels.push(curr_date.toString("dd MMM yyyy"));
    curr_date = curr_date.add(1).month();
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

  var color = dynamicColors();
  var dataset = {
    label: mfCode,
    data: [],
    backgroundColor: color,
    borderColor: color,
    fill: false,
    mfCode: mfCode
  }

  var navs = {};
  for (var i = 0; i < navConfig.data.labels.length; i++) {
    navs[navConfig.data.labels[i]] = null;
  }

  var csvLines = csvData.split(/\r\n|\n/);

  for (var i = 0; i < csvLines.length; i++) {
    var entries = csvLines[i].split(',');
    // each entry is date:nav
    var date = Date.parse(entries[0]);
    if (date !== null) {
      var dateStr = date.toString("dd MMM yyyy");
      if (dateStr in navs) {
        if (navs[dateStr] == null) {
          navs[dateStr] = entries[1];
        } else {
          console.log("Duplicate NAV " + dateStr + ":" + navs[dateStr]);
        }
      }
    }
  }

  for (var key in navs) {
    dataset.data.push(navs[key]);
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
  btn.setAttribute("class", "ui-button ui-widget ui-corner-all");
  btn.setAttribute("style", "width: 100%; margin-top: 1em; box-sizing: border-box;");

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
    }
  });

  navConfig =  {
    type: 'line',
    data: {
      labels: [],
      datasets: [],
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

