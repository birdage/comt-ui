var map;
var mapDate;
var catalog = [];
var proj3857 = new OpenLayers.Projection("EPSG:3857");
var proj4326 = new OpenLayers.Projection("EPSG:4326");

function resize() {
  var 	mapOffset 	= 103,
        resultsTableOffset = 229,
        activeMapLayersTableOffset = 170;
  $('#mapView').height($(window).height() - mapOffset);
  $('#results .table-wrapper').height($(window).height() - resultsTableOffset);
  $('#active-layers .table-wrapper').height($(window).height() - activeMapLayersTableOffset);
  if (hasScrollBar($('#active-layers .table-wrapper')[0]))
    $('#active-layers table tbody td:last-child').css('width', '37px');
  else {
    $('#active-layers table tbody td:last-child').css('width', '54px');
    $('#active-layers .table-wrapper').css('height', 'auto');
  }
  map.updateSize();
}

window.onresize = resize;

function categoryClick() {
  syncQueryResults();
}

function filterValueSelect() {
  var id = $(this).attr('id').replace('list','filter-btn');
  $('#' + id).addClass('active');
  // Give the button time to add its class (which is used for testing in the query).
  setTimeout(function() {
    syncQueryResults();
  },100);
}

function addToMap() {
  var c = catalog[$(this).parent().children('td:first-child').data('idx')];
  var lc = 0;
  // Map only the default_layer.  If none, map the 1st in the layers attr.
  var lyrName = _.keys(c.layers).concat(c.default_layer).pop();
  if (_.isEmpty(map.getLayersByName(c.name + '-' + lyrName))) {
    if (!mapDate) {
      mapDate = isoDateToDate(c.temporal[0]);
    }
    addWMS({
       name   : c.name
      ,url    : c.url
      ,layers : lyrName
      ,styles : c.layers[lyrName]
      ,times  : c.temporal
      ,bbox   : new OpenLayers.Bounds(c.spatial[1],c.spatial[0],c.spatial[3],c.spatial[2]).transform(proj4326,proj3857)
    });
    lc++;
  }

  if (lc > 0) {
    $('ul.nav li:last-child a').trigger('click');
    var times = c.temporal;
    $.each($('#active-layers table tbody tr input:checkbox'),function() {
      var name = $(this).val();
      _.each(_.filter(map.layers,function(o){return o.group == name}),function(o) {
        times = times.concat(o.times);
      });
    });
    if (times.length > 1) {
      var startDate = isoDateToDate(times[0]);
      var endDate = isoDateToDate(times.pop());
      $('#time-slider').data('slider').min = startDate.getTime();
      $('#time-slider').data('slider').max = endDate.getTime();
      $('#time-slider').slider('setValue',mapDate.getTime());
      $('#time-slider-min').val(startDate.toDateString());
      $('#time-slider-max').val(endDate.toDateString());
    }

    var datasetText = $(this).parent().children('td:first-child').text().replace(lyrName,'<b>' + lyrName + '</b>');
    var rowHtml = '<tr><td title="' + datasetText.substr(0, datasetText.indexOf("(")) + '"><div>' + datasetText + '<a href="#" title="View Data" data-group="' + c.name + '"><img src="./img/view_data.png" /></a></div></td>';
    rowHtml += '<td class="checkbox-cell"><input type="checkbox" checked value="' + c.name + '" /></td>';
    $('#active-layers table tbody').append(rowHtml);
    $('#active-layers input:checkbox').off('click');
    $('#active-layers input:checkbox').click(function() { 
      toggleLayerVisibility(($(this).val()));
    });
    $('#active-layers a').off('click');
    $('#active-layers a').click(function() {
      zoomToLayer(($(this).data('group')));
    });
    if (hasScrollBar($('#active-layers .table-wrapper')[0])) {
      $('#active-layers table thead th:last-child').css('width', '47px');
    }
    if (!$('#time-slider-wrapper').is(':visible')) {
      $('#time-slider-wrapper').toggle();
    }
  }
  else {
    alert('Oops.  This dataset is already on your map.');
  }
}

function hasScrollBar(div) {
    return (div.scrollHeight != div.clientHeight);
}

$(document).ready(function(){
  map = new OpenLayers.Map('mapView',{
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
        if (d && d.storm && d.category && !_.isEmpty(d.layers) && !_.isEmpty(d.temporal)) {
          d.name = _.keys(o)[0];
          d.idx  = catalog.length;
          catalog.push(d);
        }
      });

      // Populate the options.
      var i = 0;
      _.each(_.sortBy(_.uniq(_.pluck(catalog,'category')),function(o){return o.toUpperCase()}),function(o) {
        $('#categories').append('<label class="btn btn-default ' + (i == 0 ? 'active' : '') + '"><input type="radio" name="categories" id="' + o + '" ' + (i == 0 ? 'checked' : '') + '>' + o + '</label>');
        i++;
      });

      _.each(_.sortBy(_.uniq(_.pluck(catalog,'storm')),function(o){return o.toUpperCase()}),function(o) {
        $('#event-list').append('<option value="' + o + '">' + o + '</option>');
      });
       $('#event-list').selectpicker('refresh');

      _.each(_.sortBy(_.uniq(_.pluck(catalog,'org_model')),function(o){return o.toUpperCase()}),function(o) {
        $('#model-list').append('<option value="' + o + '">' + o + '</option>');
      });
      $('#model-list').selectpicker('refresh');

      $('#categories.btn-group input').on('change', categoryClick);
      syncQueryResults();
    }
  });

  $('#time-slider').slider({
    step: 6 * 3600000,
    formater: function(value) {
      var dateTime = new Date(value);
      return dateTime.toString();
    },
  });
  $('#time-slider').slider().on('slideStop',function(e) {
    setDate(new Date($(this).data('slider').getValue()));
  });


  resize();
  $('.selectpicker').selectpicker({width:'auto'}).on('change', filterValueSelect);
  $('.btn').button().mouseup(function(){$(this).blur();});
  $('#active-layers button').on('click', clearMap);
  $('div.btn-group.bootstrap-select').css('width', $('ul.dropdown-menu.inner.selectpicker li').css('width'));
});

function syncQueryResults() {
  $('#query-results tbody').empty();
  var i = 0;
  var c = catalog.filter(function(o) {
    var category = o.category == $('#categories.btn-group input:checked').attr('id');
    var event = $('#event-list option:selected').val() == 'ALL' || $('#event-list option:selected').val() == o.storm;
    var model = $('#model-list option:selected').val() == 'ALL' || $('#model-list option:selected').val() == o.org_model;
    return category && event && model;
  });
  _.each(_.sortBy(c,function(o){return o.name.toUpperCase()}),function(o) {
    var l = ' (' + _.keys(o.layers).sort().join(', ') + ')';
    l = l.replace(o.default_layer,'<b>' + o.default_layer + '</b>');
    $('#query-results tbody').append('<tr id="row_' + i++ +'"><td title="' + o.name + '" data-idx="' + o.idx + '"><div class="title">' + o.name + '</div>' + l + '</td></tr>');
    //<td><span class="glyphicon glyphicon-plus"></span></td>');
  });
  $('#results .table-wrapper td').on('click', addToMap);

  $('ul.nav li:first-child a').on('click', function(e){
    e.preventDefault();
    if ($(this).hasClass('active'))
      return false;
    else {
      $('#mapView, #map-view-col, #map-col').hide();
      $('#catalogue').show();
      $('li.active').removeClass('active');
      $(this).parent().addClass('active');
      resize();
    }
  });

  $('ul.nav li:last-child a').on('click', function(e){
    e.preventDefault();
    if ($(this).hasClass('active'))
      return false;
    else {
      $('#catalogue').hide();
      $('#mapView, #map-view-col, #map-col').show();
      $('li.active').removeClass('active');
      $(this).parent().addClass('active');
      resize();
    }
  });
}

function isoDateToDate(s) {
  // 2010-01-01T00:00:00 or 2010-01-01 00:00:00
  s = s.replace("\n",'');
  var p = s.split(/T| /);
  if (p.length == 2) {
    var ymd = p[0].split('-');
    var hm = p[1].split(':');
    return new Date(
       ymd[0]
      ,ymd[1] - 1
      ,ymd[2]
      ,hm[0]
      ,hm[1]
    );
  }
  else {
    return false;
  }
}

function addWMS(d) {
  var lyr = new OpenLayers.Layer.WMS(
     d.name + '-' + d.layers
    ,'http://comt.sura.org:8080/wms/datasets/' + d.name + '/'
    ,{
       layers      : d.layers
      ,transparent : true
      ,styles      : d.styles
      ,format      : 'image/png'
    }
    ,{
       isBaseLayer      : false
      ,projection       : proj3857
      ,singleTile       : true
      ,wrapDateLine     : true
      ,visibility       : true
      ,opacity          : 1
      ,noMagic          : true
      // ,transitionEffect : 'resize'
      ,time             : mapDate.format('yyyy-mm-dd"T"HH:00:00')
    }
  );
  lyr.group = d.name;
  lyr.times = d.times;
  lyr.bbox  = d.bbox;
  map.zoomToExtent(d.bbox);

  lyr.events.register('loadstart',this,function(e) {
    e.object.loaded = false;
    $('#active-layers a[data-group="' + e.object.group + '"] img').attr('src','./img/loading.gif');
  });
  lyr.events.register('loadend',this,function(e) {
    e.object.loaded = true;
    var loading = 0;
    _.each(_.filter(map.layers,function(o){return e.object.group == name}),function(o) {
      if (!e.object.loaded) {
        loading++;
      }
    });
    if (loading == 0) {
      $('#active-layers a[data-group="' + e.object.group + '"] img').attr('src','./img/view_data.png');
    }
  });
  map.addLayer(lyr);
}

function toggleLayerVisibility(name) {
  _.each(_.filter(map.layers,function(o){return o.group == name}),function(o) {
    o.setVisibility(!o.visibility);
  });
}

function zoomToLayer(group) {
  map.zoomToExtent(_.find(map.layers,function(o){return o.group == group}).bbox);
}

function setDate(dt) {
  mapDate = dt;
  $.each($('#active-layers table tbody tr input:checkbox'),function() {
    var name = $(this).val();
    _.each(_.filter(map.layers,function(o){return o.group == name}),function(o) {
      o.mergeNewParams({TIME : mapDate.format('yyyy-mm-dd"T"HH:00:00')});
    });
  });

}

function clearMap() {
  $.each($('#active-layers table tbody tr input:checkbox'),function() {
    var name = $(this).val();
    _.each(_.filter(map.layers,function(o){return o.group == name}),function(o) {
      map.removeLayer(o);
    });
  });
  $('#active-layers table tbody tr').remove();
  $('#active-layers table thead th:last-child').css('width', '30px');
  if ($('#time-slider-wrapper').is(':visible')) {
    $('#time-slider-wrapper').toggle();
  }
  mapDate = false;
}
