(function() {
  "use strict";

  var app = kintone.app.getId();
  var genka = {
    "外注費":"6212",
    "広告宣伝費":"6113",
    "ｺﾐｯｼｮﾝ料":"5214",
    "SaaS代":"6331",
    "仕入外注費":"6332"
  };
  var payers = {
    "倉貫":"1",
    "藤原":"2",
    "小口現金":"",
    "":""
  };
  
  kintone.events.on("app.record.index.show", function(event) {
    if (event.viewId !== 5299939) { // 出力用一覧（当月&出力済除外）ビュー
      return;
    }

    if (document.getElementById('btn_csv_output') !== null) {
      return;
    }

    var btnCSVOutput = document.createElement('button');
    btnCSVOutput.id = 'btn_csv_output';
    btnCSVOutput.innerHTML = 'CSV出力';
    btnCSVOutput.addEventListener('click', function() {
      request()
        .then(buildCSV)
        .then(downloadCSV)
        .then(function() {
          location.reload(true);
        })
        .catch(function(error) {
          alert(error.message);
        });
    }, false);
    kintone.app.getHeaderMenuSpaceElement().appendChild(btnCSVOutput);
  });

  function request() {
    //税理士チェック済み＆日付が前月＆CSV出力フラグがOFFのものを対象とする
    var query = "_tax_checked in (\"済\") and _date = LAST_MONTH() and _csv_output not in (\"済\")";
    query += " order by _date asc";

    var params = {
      'app': app,
      'query': query
    };

    return kintone.api('/k/v1/records', 'GET', params).then(function(resp) {
      if (resp.records[0] == null) {
        throw new Error("出力する値が取得できませんでした。");
      }

      return resp;
    }, function(resp) {
      var error = "レコード取得時にエラーが発生しました。"
      if (resp.message !== undefined) {
        throw new Error(error += '\n' + resp.message);
      }
    });
  }

  var escapeStr = function(value) {
    return '"' + (value? value.replace(/"/g, '""'): '') + '"';
  };

  function buildCSV(resp) {
    var csv = [];
    var row = [];
    for (var i=0; i<resp.records.length; i++) {
      var record = resp.records[i];
      var expenseArray = record._expense.value.split(':');
      var expense = expenseArray[0];
      var expenseCode = expenseArray[1];
      var genkaCode = genka[expense];
      var payer = record._name.value;
      var outline = record._payee.value + ":" + record._detail.value;
      row = [];
      row.push("1");  // 1処理区分
      row.push("");   // 2 データID
      row.push(escapeStr(record._date.value)); // 3 伝票日付
      row.push("");   // 4 伝票番号
      row.push("");   // 5 入力日付
      //--------------------------借方
      row.push(escapeStr(expenseCode)); // 6 借方・科目
      if (expense === "外注費") {              // 7 補助コード
        row.push(13);
      } else {
        row.push(""); 
      }
      row.push("");   // 8 部門コード
      row.push("");   // 9 取引先コード
      row.push("");   // 10 取引先名
      if (!genkaCode) { // 11 税種別
        row.push(60); // 原価ではない経費は60
      } else {
        row.push(50); // 原価は50
      }
      row.push(1);  // 12 事業区分
      row.push(8);  // 13 税率 税率8%
      row.push(1);  // 14 内外別記 内税表記は1
      row.push(record._price.value); // 15 金額
      row.push("");  // 16 税額
      row.push(escapeStr(outline));     // 17 摘要
      //--------------------------貸方
      if (record._name.value === "小口現金") {  // 18 貸方・科目（小口現金の場合は1118）
        row.push("1118");
      } else {
        row.push("2114");
      }
      var payerCode = payers[payer];
      if (!payerCode) {
        payerCode = "";
      }
      row.push(payerCode); // 19 補助コード
      row.push(""); // 20 部門コード
      row.push(""); // 21 取引先コード
      row.push(""); // 22 取引先名
      if (!genkaCode) { // 23 税種別
        row.push(60); // 原価ではない経費は60
      } else {
        row.push(50); // 原価は50
      }
      row.push(1);  // 24 事業区分
      row.push(8);  // 25 税率 税率8%
      row.push(1);  // 26 内外別記 内税表記は1
      row.push(escapeStr(record._price.value));  // 27 金額
      row.push("");  // 28 税額
      row.push(escapeStr(outline));  // 29 摘要
      csv.push(row);

      setCSVOutput(record.$id.value);
    }

    return csv;
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
    var sjisArray = Encoding.convert(array, "SJIS", "UNICODE");
    var uint8Array = new Uint8Array(sjisArray);
    var blob = new Blob([uint8Array], { type: 'text/csv'});

    if (window.navigator.msSaveBlob) {
      window.navigator.msSaveBlob(blob, filename);
    } else {
      var blobUrl = (window.URL || window.webkitURL).createObjectURL(blob);
      var e = new MouseEvent('click');
      var a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.click();
    }
  }

  function getTimeStamp() {
    var d = new Date();
    var YYYY = d.getFullYear();
    var MM = (d.getMonth() + 1);
    if (MM < 10) { MM = '0' + MM; }
    return '' + YYYY + MM;
  }

  function setCSVOutput(recordId) {
    var body = {
      "app": app,
      "id": Number(recordId),
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

})();
