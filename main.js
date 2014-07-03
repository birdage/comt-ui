var startDate = new Date(Date.now()),
    endDate,
    hour = 3600000,
    day = 86400000;

var startDateMil = startDate.getTime(),
    endDateMil = startDate.getTime() + 3 * day;

    endDate = new Date(endDateMil);

function resize() {
  var 	mapOffset 	= 90,
  		tableOffset = 240;
  $('#map').height($(window).height() - mapOffset - 2);
  $('#table-wrapper').height($(window).height() - tableOffset - 2);
}

window.onresize = function(e){
  resize();
};

function toggleCheckboxes() {
  var checkboxes = $('#results > div > table > tbody input');
  if ($(this).prop('checked')) {
    checkboxes.prop('checked', true);
    $(checkboxes).closest('tr').removeClass('success');
    $(checkboxes).closest('tr').addClass('success');
  }
  else {
    checkboxes.prop('checked', false);
    $(checkboxes).closest('tr').removeClass('success');
  }
}

function toggleCheckbox() {
  var checkbox = $(this).parent().find('input');
  if (checkbox.prop('checked'))
    checkbox.prop('checked', false);
  else
    checkbox.prop('checked', true);
  $(this).parent().toggleClass('success');
  $('#results > table > thead > tr > th > input').prop('checked', false);
}

$(document).ready(function(){
  resize();
  $('.selectpicker').selectpicker();
  $('.btn').button().mouseup(function(){
  	$(this).blur();
  });
  $('#results > table > thead > tr > th > input').on('click', toggleCheckboxes);
  $('#table-wrapper td:nth-child(2)').on('click', toggleCheckbox);
  $('#table-wrapper td input').on('click', function () {$(this).closest('tr').toggleClass('success');});
  $('#time-slider').slider({
    value:  startDateMil,
    min: startDateMil,
    max: endDateMil,
    step: 6 * hour,
    formater: function(value) {
      var dateTime = new Date(value);
      return 'Current value: ' + dateTime.toString();
    }
  });
  $('#time-slider-min').val(startDate.toString());
  $('#time-slider-max').val(endDate.toString());
});