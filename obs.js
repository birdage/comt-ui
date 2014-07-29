var obs = [
  {'watlev_TCOON' : {
     category  : 'inundation_tropical'
    ,org_model : 'OBSERVATIONS'
    ,storm     : 'IKE'
    ,temporal  : ['2008-09-06T00:00:00','2008-09-20T23:54:00']
    ,spatial   : [-95,28,-80,30]
    ,url       : 'http://testbedapps-dev.sura.org/thredds/catalog/imeds/measurement/catalog.html?dataset=imeds/inundation/measurement/watlev_TCOON.nc'
    ,getObs    : {
       url       : 'http://testbedapps-dev.sura.org/thredds/sos/imeds/measurement/watlev_TCOON.nc?request=GetObservation&service=SOS&version=1.0.0&responseFormat=text/xml;schema%3D%22om/1.0.0%22'
      ,offering  : 'urn:tds:station.sos:'
      ,procedure : 'urn:tds:station.sos:'
      ,property  : 'watlev'
    }
    ,stations  : [
      {'TCOON_87704751' : {spatial : [-93.93100,29.86720],temporal : ['2008-09-06T00:00:00','2008-09-20T23:54:00']}}
    ]
    ,layers    : {'zeta' : 'OBSERVATION'}
  }}
];
