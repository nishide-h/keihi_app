(function() {
  "use strict";
  
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

    btnCSVOutput.onclick = function() {
      alert('CSVを出力します');
    };

    kintone.app.getHeaderMenuSpaceElement().appendChild(btnCSVOutput);
  });
})();
