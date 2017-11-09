(function() {
  "use strict";
  
  kintone.events.on("app.record.index.show", function(event) {
    if (event.viewId !== 5299939) { // 出力用一覧（当月&出力済除外）ビュー
      return;
    }

    var csv = [];
    var app = kintone.app.getId();
        
    if (document.getElementById('btn_csv_output') !== null) {
      return;
    }

    var btnCSVOutput = document.createElement('button');
    btnCSVOutput.id = 'btn_csv_output';
    btnCSVOutput.innerHTML = 'CSV出力';

    /*
     * * まずは登録されている経費データをそのままCSV出力・ダウンロードできるプログラムを作成してください
    * 税理士チェック済み＆日付が前月＆CSV出力フラグがOFFのものを対象とする
    * 出力したらCSV出力フラグをONにする
    * CSVのフォーマットはshift-jisとする
    */

    btnCSVOutput.onclick = function() {
      csv = [];
      getMakeCSV();
      downloadCSV(csv);
    };

    kintone.app.getHeaderMenuSpaceElement().appendChild(btnCSVOutput);
    
    function getMakeCSV() {
      var escapeStr = function(value) {
        return '"' + (value? value.replace(/"/g, '""'): '') + '"';
      };

      var resp = request();
      var row = [];
      for (var i=0; i<resp.records.length; i++) {
        var record = resp.records[i];
        row = [];
        //row.push(escapeStr(record['_tax_checked'].value));
        //row.push(escapeStr(record['_tax_type'].value));
        //row.push(escapeStr(record['_csv_output'].value));
        //row.push(escapeStr(record['_payment_due_date'].value));
        row.push(escapeStr(record['_name'].value));
        row.push(escapeStr(record['_expense'].value));
        row.push(escapeStr(record['_date'].value));
        row.push(escapeStr(record['_detail'].value));
        row.push(escapeStr(record['_price'].value));
        csv.push(row);

        setCSVOutput(record['\$id'].value);
      }
    }

    function request() {
      //税理士チェック済み＆日付が前月＆CSV出力フラグがOFFのものを対象とする
      var query = "_tax_checked in (\"済\") and _date = LAST_MONTH() and _csv_output not in (\"済\") order by _date asc"

      var appUrl = kintone.api.url('/k/v1/records') + '?app=' + app + '&query=' + query;
      var xmlHttp = new XMLHttpRequest();
      xmlHttp.open('GET', appUrl, false);
      xmlHttp.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      xmlHttp.send(null);

      var respdata = JSON.parse(xmlHttp.responseText);
      return respdata;
    }
    
    function downloadCSV(csv) {
      var filename = '未払計上仕訳_' + getTimeStamp() + '.csv';

      var str2array = function(str) {
        var array = [], i, il=str.length;
        for (i=0; i<il; i++) {
          array.push(str.charCodeAt(i));
        }
        return array;
      };

      var csvbuf = csv.map(function(e){return e.join(',')}).join('\r\n');
      var array = str2array(csvbuf);
      var sjis_array = Encoding.convert(array, "SJIS", "UNICODE");
      var uint8_array = new Uint8Array(sjis_array);
      var blob = new Blob([uint8_array], { type: 'text/csv'});
      
      if (window.navigator.msSaveBlob) {
        window.navigator.msSaveBlob(blob, filename);
      } else {
        var blobUrl = (window.URL || window.webkitURL).createObjectURL(blob);
        var e = document.createEvent('MouseEvents');
        e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        var a = document.createElementNS("http://www.w3.org/1999/xhtml", "a");
        a.href = blobUrl;
        a.download = filename;
        a.dispatchEvent(e);
      }
    }

    function getTimeStamp() {
      var d = new Date();
      var YYYY = d.getFullYear();
      var MM = (d.getMonth() + 1);
      var DD = d.getDate();
      var hh = d.getHours();
      var mm = d.getMinutes();
      if (MM < 10) { MM = '0' + MM; }
      if (DD < 10) { DD = '0' + DD; }
      if (hh < 10) { hh = '0' + hh; }
      else if (mm < 10) { mm = '0' + mm; }
      String();
      return '' + YYYY + MM + DD + hh + mm;
    }

    function setCSVOutput(record_id) {
      var body = {
        "app": app,
        "id": Number(record_id),
        "record": {
          "_csv_output": {
            "value": ["済"]
          }
        }
      };
      
      kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', body, function(resp) {
        //console.log(resp);
      }, function(error) {
        console.log(error);
      });
    }
  });
})();
