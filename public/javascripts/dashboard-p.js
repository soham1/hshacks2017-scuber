$(
  function() {
    navigator.geolocation.getCurrentPosition(function(position) {
      var latitude = position.coords.latitude;
      var longitude = position.coords.longitude;
      $('#availableBtn').attr('href', "/available/lat=" + latitude + "/long=" + longitude).removeClass("disabled");
    }, function(error) {
      console.log(error);
    });
  }
);
