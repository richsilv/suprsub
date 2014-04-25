Package.describe({
  summary: "A simple multi-page Tour/Joyride plugin designed to play nicely with Iron Router"
});

Package.on_use(function (api, where) {
  api.use(['iron-router', 'templating', 'underscore', 'jquery'], 'client');    
  
  api.add_files('lib/iron-router-tour.js', 'client');
  api.add_files('lib/iron-router-tour.css', 'client');
  api.add_files('lib/iron-router-tour.html', 'client');
});

Package.on_test(function (api) {
  api.use('iron-router-tour');

  api.add_files('iron-router-tour_tests.js', 'client');
});
