var startDate = new Date(Date.now()),
    endDate,
    hour = 3600000,
    day = 86400000;

var startDateMil = startDate.getTime(),
    endDateMil = startDate.getTime() + 3 * day;

    endDate = new Date(endDateMil);

function resize() {
  var 	mapOffset 	= 90,
        tableOffset = 391;
  $('#map').height($(window).height() - mapOffset - 2);
  $('#results .table-wrapper').height($(window).height() - tableOffset);
}

window.onresize = resize;

function scenarioClick() {
  alert('button text: ' + $(this).parent().text());
}

function filter() {
  var enabled = false;
  var buttonText = $(this).text();
  if (!$(this).hasClass('active'))
    enabled = true;
  alert(buttonText + ' : ' + enabled);
}

function filterChange() {
  var listId = $(this).attr('id');
  var value = '';
  if (listId == 'event-list')
    value = $($('select option:selected')[0]).val();
  else
    value = $($('select option:selected')[1]).val();
  alert(listId + ' value: ' + value);
}

function addToMap() {
  var datasetText = $(this).parent().children('td:first-child').text();
  var rowHtml = '<tr><td>' + datasetText + '<a href="#" title="View Data"><img src="./img/view_data.png" /></a></td>' +
    '<td class="checkbox-cell"><input type="checkbox" value="uv" /></td>' +
    '<td class="checkbox-cell"><input type="checkbox" value="ele" /></td>' +
    '<td class="checkbox-cell"><input type="checkbox" value="o2" /></td></tr>';
  $('#active-layers table tbody').append(rowHtml);
  if (hasScrollBar($('#active-layers .table-wrapper')[0]))
    $('#active-layers table thead th:last-child').css('width', '47px');
}

function hasScrollBar(div) {
    return (div.scrollHeight != div.clientHeight);
}

function clearMap() {
  $('#active-layers table tbody tr').remove();
  $('#active-layers table thead th:last-child').css('width', '30px');
}

$(document).ready(function(){
  resize();
  $('.navbar .btn-group input').on('change', scenarioClick);
  $('.btn-filter').on('click', filter);
  $('.selectpicker').selectpicker().on('change', filterChange);
  $('.btn').button().mouseup(function(){$(this).blur();});
  $('#results .table-wrapper td:nth-child(2)').on('click', addToMap);
  $('#active-layers button').on('click', clearMap);
  $('#time-slider').slider({
    value:  startDateMil,
    min: startDateMil,
    max: endDateMil,
    step: 6 * hour,
    formater: function(value) {
      var dateTime = new Date(value);
      return dateTime.toString();
    }
  });
  $('#time-slider-min').val(startDate.toDateString());
  $('#time-slider-max').val(endDate.toDateString());
  $('div.btn-group.bootstrap-select').css('width', $('ul.dropdown-menu.inner.selectpicker li').css('width'));
});