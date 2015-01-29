var argv = require('minimist')(process.argv.slice(2));
var FreshBooks = require('freshbooks');
var _ = require('underscore');
var async = require('async');
var xlsx = require('xlsx');

var freshbooks = new FreshBooks(API_URL, API_TOKEN);
var invoice = new freshbooks.Invoice();
var projects = new freshbooks.Project();
var time_entry = new freshbooks.Time_Entry();
var staff = new freshbooks.Staff();

var projects_colab = [];

var workbook = xlsx.readFile('pay_rates.xlsx');

var i;

var contractor_rates = {};

for (i=2; i<=43; i++) {
  if (workbook.Sheets.Rates['A' + i] && workbook.Sheets.Rates['C' + i]) {
    contractor_rates[workbook.Sheets.Rates['A' + i].v] = workbook.Sheets.Rates['C' + i].v;
  }
}


projects.list({}, function(err, projects) {
  _.each(projects, function(project, index) {
    projects_colab.push({
      name: project.name,
      id:project.project_id
    });
  });

  async.eachSeries(projects_colab, function(project, cb) {
    project.contractors = {};
    time_entry.list({ project_id: project.id, date_from:'2015-01-27', date_to:'2015-01-28'}, function(err, entries) {
      var total = 0;
      async.eachSeries(entries, function(entry, callback) {
        staff.get(entry.staff_id, function(err, staff) {
          staff.name = staff.first_name + ' ' + staff.last_name;
          if (!project.contractors[staff.name]) {
            project.contractors[staff.name] = {
              'CoLab Cost': 0,
              hours: 0
            }
          }
          project.contractors[staff.name].hours += parseFloat(entry.hours)
          project.contractors[staff.name]['CoLab Cost'] += parseFloat(entry.hours) * parseFloat(contractor_rates[staff.name]);
          callback();
        });
      }, function(err, result) {
        cb();
      });
    });
  }, function(err, result) {
    console.log(JSON.stringify(projects_colab))
  });

});

