(function() {
  "use strict";
  
  kintone.events.on("app.record.index.show", function(event) {
    if (event.viewId !== 5299939) { // 出力用一覧（当月&出力済除外）ビュー
      return;
    }

    var csv = [];
    var resp = [];
    var query = [];
    var app_id = kintone.app.getRelatedRecordsTargetAppId('');
    var date = new Date();
    date.setMonth(date.getMonth() -1);
    var requestParam = {
      'app': kintone.app.getId(),
      'query': kintone.app.getQuery()
    };
    
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
      getMakeCSV();
      downloadCSV(csv);
    };

    kintone.app.getHeaderMenuSpaceElement().appendChild(btnCSVOutput);
    
    function getMakeCSV() {
      var escapeStr = function(value) {
        return '"' + (value? value.replace(/"/g, '""'): '') + '"';
      };

      kintone.api(kintone.api.url('/k/v1/records', true), 'GET', requestParam, function(resp) {
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
        }
      });
    }
    
    function downloadCSV(csv) {
      var filename = '未払計上仕訳_' + getTimeStamp() + '.csv';
      var csvbuf = csv.map(function(e){return e.join(',')}).join('\r\n');
      var bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      var blob = new Blob([bom, csvbuf], {type: 'text/csv'});
      
      if (window.navigator.msSaveBlob) {
        window.navigator.msSaveBlob(blob, filename);
      } else {
        var url = (window.URL || window.webkitURL);
        var blobUrl = url.createObjectURL(blob);
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
  });
})();
