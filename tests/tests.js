var assert = require('assert');

suite('Pitches', function() {
  test('in the server', function(done, server) {
    server.eval(function() {
      Pitches.insert({
        name: "My Back Garden",
        owner: "Richard",
        priority: 2,
        address: "N1 2PQ",
        location: {
          lat: 56,
          lng: -4.4
        }
      });
      var docs = Pitches.find().fetch();
      emit('docs', docs);
    });

    server.once('docs', function(docs) {
      assert.equal(docs.length, 1);
      done();
    });
  });
});