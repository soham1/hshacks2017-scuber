$(document).ready(function() {
  $('.button-collapse').sideNav({
    edge: 'left', // Choose the horizontal origin
    closeOnClick: false, // Closes side-nav on <a> clicks, useful for Angular/Meteor
    draggable: true // Choose whether you can drag to open on touch screens
  });
  
  $('select').material_select();
  
  $(document).on('click', '.card', function (e) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var latitude = position.coords.latitude;
      var longitude = position.coords.longitude;
      $("#currLong").val(longitude);
      $("#currLat").val(latitude);
      $("#findMeForm").submit();
    }, function(error) {
      console.log(error);
    });
  });
});
