var map;
var catalog = [];
var proj3857 = new OpenLayers.Projection("EPSG:3857");
var proj4326 = new OpenLayers.Projection("EPSG:4326");

var startDate = new Date(Date.now()),
    endDate,
    hour = 3600000,
    day = 86400000;

var startDateMil = startDate.getTime(),
    endDateMil = startDate.getTime() + 3 * day;

    endDate = new Date(endDateMil);

function resize() {
  var 	mapOffset 	= 139,
        tableOffset = 391;
  $('#map').height($(window).height() - mapOffset - 2);
  $('#results .table-wrapper').height($(window).height() - tableOffset);
  map.updateSize();
}

window.onresize = resize;

function categoryClick() {
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
  map = new OpenLayers.Map('map',{
    layers  : [
      new OpenLayers.Layer.XYZ(
         'ESRI Ocean'
        ,'http://services.arcgisonline.com/ArcGIS/rest/services/Ocean_Basemap/MapServer/tile/${z}/${y}/${x}.jpg'
        ,{
           sphericalMercator : true
          ,isBaseLayer       : true
          ,wrapDateLine      : true
        }
      )
    ]
    ,center : new OpenLayers.LonLat(-83,28).transform(proj4326,proj3857)
    ,zoom   : 5
  });

  $.ajax({
     url : 'http://comt.sura.org:8080/wms/datasets'
    ,dataType : 'jsonp'
    ,success : function(r) {
      // The catalog comes in as an array w/ each element containing one key (name) that points
      // to the payload.  Reduce the complexity by one and simply pump the catalog into an
      // array of objects where the name is one of the attrs.
      _.each(r,function(o) {
        var d = _.values(o)[0];
        if (d && d.category) {
          d.name = _.keys(o)[0];
          catalog.push(d);
        }
      });

      // Populate the options.
      _.each(_.sortBy(_.uniq(_.pluck(catalog,'category')),function(o){return o.toUpperCase()}),function(o) {
        $('#categories').append('<label class="btn btn-default"><input type="radio" name="categories" id="' + o + '">' + o + '</label>');
      });

      _.each(_.sortBy(_.uniq(_.pluck(catalog,'storm')),function(o){return o.toUpperCase()}),function(o) {
        $('#event-list').append('<option value="' + o + '">' + o + '</option>');
      });
       $('#event-list').selectpicker('refresh');

      _.each(_.sortBy(_.uniq(_.pluck(catalog,'org_model')),function(o){return o.toUpperCase()}),function(o) {
        $('#model-list').append('<option value="' + o + '">' + o + '</option>');
      });
      $('#model-list').selectpicker('refresh');

      syncQueryResults();
    }
  });

  resize();
  $('.navbar .btn-group input').on('change', categoryClick);
  $('.btn-filter').on('click', filter);
  $('.selectpicker').selectpicker().on('change', filterChange);
  $('.btn').button().mouseup(function(){$(this).blur();});
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

function syncQueryResults() {
  var i = 0;
  _.each(_.sortBy(_.pluck(catalog,'name'),function(o){return o.toUpperCase()}),function(o) {
    $('#query-results tbody').append('<tr id="row_' + i++ +'"><td>' + o + '</td><td><span class="glyphicon glyphicon-plus"></span></td></tr>');
  });
  $('#results .table-wrapper td:nth-child(2)').on('click', addToMap);
}
