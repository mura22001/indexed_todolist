/*
Copyright (c) 2016 Adways Inc.
Released under the MIT license


Permission is hereby granted, free of charge, to any person obtaining a 
copy of this software and associated documentation files (the 
"Software"), to deal in the Software without restriction, including 
without limitation the rights to use, copy, modify, merge, publish, 
distribute, sublicense, and/or sell copies of the Software, and to 
permit persons to whom the Software is furnished to do so, subject to 
the following conditions:

The above copyright notice and this permission notice shall be 
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, 
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF 
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE 
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION 
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION 
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

//ブラウザ対応のための宣言
window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

//ここからDB関連の処理

//tasksオブジェクトを使って、いじります。
var tasks = {
  dbName: "myTask", //dbの名前
  dbVersion: 1,     //dbのバージョン
  db: null          //dbをここに入れます
};

//init用メソッド
tasks.init = function() {
  var request = indexedDB.open(tasks.dbName,tasks.dbVersion); //dbに接続
  request.onupgradeneeded = function(event) { //dbversionが引数よりも小さい場合、アップグレード。ない場合は作成。
    var db = event.target.result;
    db.onerror = function(event) { //エラー処理
      alert("DBの作成に失敗しました。");
    };
    if(db.objectStoreNames.contains('task')) { //アップデートする際、同名のオブジェクトがあるとアップデートできないため、データを削除。データのマージに関しては、今後記事にします。
      db.deleteObjectStore('task');
    }
    var objectStore = db.createObjectStore("task", { keyPath: "id", autoIncrement: true }); //オブジェクトストアの作成
    objectStore.createIndex("start_timeIndex", "start_time", { unique: false }); //インデックスの作成
    objectStore.createIndex("end_timeIndex", "end_time", { unique: false });
    objectStore.createIndex("add_timeIndex", "add_time", { unique: false });
    objectStore.createIndex("updt_timeIndex", "updt_time", { unique: false });
    objectStore.createIndex("task_nameIndex", "task_name", { unique: false });
    alert("DBを作成しましたので、ページを更新します。");
    location.reload(); //作成した後、ページを更新する必要があります。
  };

  request.onsuccess = function(event) { //アップデートが必要なく、接続できた場合の処理
    tasks.db = event.target.result;
    alert("DBに接続成功");
  };
};

//タスクの追加処理
tasks.addTask = function(insertData) {
  var db = tasks.db; //dbの指定
  var transaction = db.transaction("task","readwrite"); //処理用のトランザクションを作ります。
  var objectStore = transaction.objectStore("task"); //オブジェクトストアにアクセスします。
  var request = objectStore.put({ //オブジェクトストアに追加のリクエストします。
    task_name: insertData.task_name, 
    start_time: insertData.start_time,
    end_time: insertData.end_time,
    add_time: new Date().getTime(),
    comment: ""
  });

  transaction.oncomplete = function() { //追加成功の処理
    alert('保存成功');
    tasks.getAll(tasks.renderAll);
  };

  transaction.onerror = function(error) { //追加失敗の処理
    alert('保存失敗。エラーメッセージ:', error);
  };
};

//データベースの削除処理
tasks.deleteDB = function() {
  if(tasks.db !== null) tasks.db.close(); //dbの接続を切ります。
  var request = indexedDB.deleteDatabase(tasks.dbName);
  request.onblocked = function() { //他のタブが接続しているとブロックされます。
    alert("他のタブがDBを使用中です。他のタブを閉じて削除してください。");
  };

  request.onsuccess = function() {
    alert("DBを削除したので、ページを更新します。");
    location.reload();    
  };


  request.onerror=function() {
    alert("DBの削除に失敗しました。");
  };
};

//タスク全件取得処理
tasks.getAll = function(render) {
  if (render) document.getElementById('table_body').innerHTML = '';
  var db = tasks.db;
  var transaction = db.transaction("task","readonly");
  var objectStore = transaction.objectStore("task");
  var request = objectStore.openCursor();
  request.onsuccess = function(event) {
    var cursor = event.target.result;
    if(cursor) {
      if(render) render(cursor.value);
      cursor.continue();
    }
  };
};

//タスク全件表示処理
tasks.renderAll = function(data) {
  var table_row = document.createElement('tr');
  var start_time = formatDate(new Date(data.start_time));
  var end_time = formatDate(new Date(data.end_time));
  var add_time = formatDate(new Date(data.add_time));
  updt_time = "";
  if (data.updt_time !== undefined) {
    updt_time = formatDate(new Date(data.updt_time));
  }
  table_row.setAttribute('onClick',"getTask("+data.id+")");
  table_row.innerHTML = '<td>' + data.id + '</td><td>' + start_time + '</td><td>' + end_time + '</td><td>' + data.task_name + '</td><td>' + add_time + '</td><td>' + updt_time + '</td>';
  document.getElementById("table_body").appendChild(table_row); //table_bodyというIDのテーブルに行を追加してます。
};

//タスク一件取得処理
tasks.getOne = function(id,render) {
  var db = tasks.db;
  var transaction = db.transaction("task","readonly");
  var objectStore = transaction.objectStore("task");
  var request = objectStore.get(id);
  request.onsuccess = function(event) {
    var result = event.target.result;
    if(result) {
      if(render) render(result);
    }
  };
};

//タスク削除処理
tasks.delete = function(id) {
  var db = tasks.db;
  var transaction = db.transaction("task","readwrite");
  var objectStore = transaction.objectStore("task");
  var request = objectStore.delete(id);
  request.onerror = function(event) {
    alert("DBに接続できません。");
  };
  request.onsuccess = function(event) {
    alert("タスク削除成功");
    document.getElementById("edit_form_area").innerHTML = "";
    tasks.getAll(tasks.renderAll);
  };
};

//タスク詳細表示処理
tasks.render = function(data) {
  document.getElementById("edit_form_area").innerHTML = ""; //edit_form_areaというIDのdivに追加するための下処理
  create_form("edit_form",form_edit,data); //編集用フォーム表示する
};

//タスク編集処理
tasks.edit = function(id) {
  var db = tasks.db;
  var transaction = db.transaction("task","readwrite");
  var objectStore = transaction.objectStore("task");
  var req = objectStore.get(id);
  req.onerror = function(event) {
    alert("DBに接続できません");
  };

  req.onsuccess = function(event) {
    var data = event.target.result;
    data.task_name = edit_form.task_name.value;
    data.start_time = new Date(document.edit_form.edit_form_start_year.value,document.edit_form.edit_form_start_month.value,document.edit_form.edit_form_start_date.value,document.edit_form.edit_form_start_hour.value,document.edit_form.edit_form_start_minutes.value).getTime(); //フォームの時間をくっつける処理。
    data.end_time = new Date(document.edit_form.edit_form_end_year.value,document.edit_form.edit_form_end_month.value,document.edit_form.edit_form_end_date.value,document.edit_form.edit_form_end_hour.value,document.edit_form.edit_form_end_minutes.value).getTime(); //フォームの時間をくっつける処理。
    data.comment = edit_form.comment.value;
    data.updt_time = new Date().getTime();
    var requestUpdate = objectStore.put(data);

    requestUpdate.onerror = function(event) {
      alert("編集失敗");
    };

    requestUpdate.onsuccess = function(event) {
      alert("編集成功");
      tasks.getAll(tasks.renderAll);
    };
  };
};
//ここまでDB関連の処理



//ここからボタンに紐づいたJSの処理
//タスク削除ボタンが押された際の処理
function deleteTask(id) { 
  tasks.delete(id);
}

//タスク削除ボタンが押された際の処理
function editTask(id) { 
  tasks.edit(id);
}

//タスクをがクリックされた際の処理
function getTask(id) { 
  tasks.getOne(id,tasks.render);
}

//表示ボタンが押された際の処理
function show() {
  if(tasks.db === null) {
    alert("DBに接続してください。");
  }
  else {
    tasks.getAll(tasks.renderAll);
  }
}

//DBに接続ボタンが押された際の処理
function createDB() {
  tasks.init();
}

//DBを削除ボタンが押された際の処理
function deleteDB() {
  tasks.deleteDB();
}

//保存ボタンが押された際の処理
function save() {
  if (tasks.db === null) {
    alert("DBに接続してください。");
  }
  else {
    start_date = new Date(document.input_form.input_form_start_year.value,document.input_form.input_form_start_month.value,document.input_form.input_form_start_date.value,document.input_form.input_form_start_hour.value,document.input_form.input_form_start_minutes.value);
    end_date = new Date(document.input_form.input_form_end_year.value,document.input_form.input_form_end_month.value,document.input_form.input_form_end_date.value,document.input_form.input_form_end_hour.value,document.input_form.input_form_end_minutes.value);
    var insertData = {
      start_time: start_date.getTime(),
      end_time: end_date.getTime(),
      task_name: document.input_form.task_name.value
    };
    tasks.addTask(insertData);
  }
}
//ここまでボタンに紐づいたJSの処理

//ここから入力フォームのための処理
//日付のフォーマット処理
var formatDate = function (date, format) {
  if (!format) format = 'YYYY-MM-DD hh:mm';
  format = format.replace(/YYYY/g, date.getFullYear());
  format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2));
  format = format.replace(/DD/g, ('0' + date.getDate()).slice(-2));
  format = format.replace(/hh/g, ('0' + date.getHours()).slice(-2));
  format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2));
  format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2));
  return format;
};

//がんばって作りました。
//普通にdatetimepickerのjqueryプラグインで問題ないです。
//日付表示フォームの作成処理
function create_datepicker(name) {
  var select_year = document.createElement('select');
  select_year.setAttribute('type',"select");
  select_year.setAttribute('name',name+"_year");
  select_year.setAttribute('onChange',"changeDate('"+name+"')");
  select_year.length = 0;
  for (i = 0; i < 10; i++) {
    select_year.length++;
    select_year.options[i] = new Option(2016+i,2016+i);
  }

  var select_month = document.createElement("select");
  select_month.setAttribute('type',"select");
  select_month.setAttribute('name',name+"_month");
  select_month.setAttribute('onChange',"changeDate('"+name+"')");
  select_month.length = 0;
  for (i = 0; i < 12; i++) {
    select_month.length++;
    select_month.options[i] = new Option(i+1,i);
  }

  var select_date = document.createElement('select');
  select_date.setAttribute('type',"select");
  select_date.setAttribute('name',name+"_date");
  select_date.length = 0;
  for (i = 0; i < 31; i++) {
    select_date.length++;
    select_date.options[i] = new Option(i+1,i+1);
  }

  var select_hour = document.createElement('select');
  select_hour.setAttribute('type',"select");
  select_hour.setAttribute('name',name+"_hour");
  select_hour.length = 0;
  for (i = 0; i < 24; i++) {
    select_hour.length++;
    select_hour.options[i] = new Option(i,i);
  }

  var select_minutes = document.createElement('select');
  select_minutes.setAttribute('type',"select");
  select_minutes.setAttribute('name',name+"_minutes");
  select_minutes.length = 0;
  for (i = 0; i < 60; i++) {
    select_minutes.length++;
    select_minutes.options[i] = new Option(i,i);
  }

  return [select_year,select_month,select_date,select_hour,select_minutes];
}

//入力フォーム生成処理
function create_form(form_name,callback,data) {
  var form = document.createElement('form');
  form.setAttribute('action',"#");
  form.setAttribute('name',form_name);
 
  var task_input = document.createElement('input');
  task_input.setAttribute('type',"text");
  task_input.setAttribute('name',"task_name");
 
  var startdate_selection = create_datepicker(form_name+"_start");
  var enddate_selection = create_datepicker(form_name+"_end");
 
  var startDiv = document.createElement("div");
  startDiv.innerHTML = "開始日時: ";
  for (i = 0; i < startdate_selection.length; i++) {
    startDiv.appendChild(startdate_selection[i]);
  }
 
  var endDiv = document.createElement("div");
  endDiv.innerHTML = "終了日時: ";
  for (i = 0; i < enddate_selection.length; i++) {
    endDiv.appendChild(enddate_selection[i]);
  }
 
  var taskDiv = document.createElement("div");
  taskDiv.innerHTML = "タスク名: ";
  taskDiv.appendChild(task_input);
 
  form.appendChild(startDiv);
  form.appendChild(endDiv);
  form.appendChild(taskDiv);
 
  var submit_button = document.createElement("input");
  submit_button.setAttribute('type',"button");
  submit_button.setAttribute('value',"保存");
  submit_button.setAttribute('name',"button");
  submit_button.setAttribute('onclick',"save()");
 
 
  form.appendChild(submit_button);
  document.getElementById(form_name+"_area").appendChild(form);
  if(callback !== undefined && data !== undefined) {
    callback(data);
  }
}

//編集用フォーム生成処理
var form_edit = function(data) {
  var form = document.edit_form;
  var start_time = new Date(data.start_time);
  form.edit_form_start_year.value = start_time.getFullYear();
  form.edit_form_start_month.value = start_time.getMonth();
  form.edit_form_start_date.value = start_time.getDate();
  form.edit_form_start_hour.value = start_time.getHours();
  form.edit_form_start_minutes.value = start_time.getMinutes();
 
  var end_time = new Date(data.end_time);
  form.edit_form_end_year.value = end_time.getFullYear();
  form.edit_form_end_month.value = end_time.getMonth();
  form.edit_form_end_date.value = end_time.getDate();
  form.edit_form_end_hour.value = end_time.getHours();
  form.edit_form_end_minutes.value = end_time.getMinutes();
 
  changeDate("edit_form_start");
  changeDate("edit_form_end");
 
  form.task_name.value = data.task_name;
 
  var submit_button = form.button;
  submit_button.setAttribute('value',"タスク編集");
  submit_button.setAttribute('onclick',"editTask("+data.id+")");
 
  var delete_button = document.createElement("input");
  delete_button.setAttribute('type',"button");
  delete_button.setAttribute('value',"タスク削除");
  delete_button.setAttribute('onclick',"deleteTask("+data.id+")");
 
  var textarea = document.createElement("textarea");
  textarea.setAttribute('name',"comment");
  textarea.setAttribute('row',"5");
  textarea.setAttribute('col',"50");
  textarea.innerHTML = data.comment;
  var textDiv = document.createElement("div");
  textDiv.innerHTML = "コメント: ";
  textDiv.appendChild(textarea);
  form.insertBefore(textDiv,submit_button);
  form.appendChild(delete_button);
};

//うるう年等の日の対応処理
function changeDate(month_selection) {
  var year = parseInt(document.getElementsByName(month_selection+"_year")[0].value);
  var month = parseInt(document.getElementsByName(month_selection+"_month")[0].value)+1;
  var select_date = document.getElementsByName(month_selection+"_date")[0];
  select_date.setAttribute('type',"select");
  select_date.setAttribute('name',month_selection+"_date");
  select_date.length = 0;
  if(month == 2 || month == 4 || month == 6 || month == 9 || month == 11) {
    if (month == 2) {
      var maxdate = 28;
      if(((year%4)===0&&(year%100)!==0) ||(year%400)===0) {
        maxdate = 29;
      }
      for (i = 0; i < maxdate; i++) {
        select_date.length = i;
        select_date.options[i] = new Option(i+1,i+1);
      }
    }
    else {
      for (i = 0; i < 30; i++) {
        select_date.length++;
        select_date.options[i] = new Option(i+1,i+1);
      }
    }
  }
  else {
    for (i = 0; i < 31; i++) {
      select_date.length++;
      select_date.options[i] = new Option(i+1,i+1);
    }
  }
}

/*(function() { //ページの表示時にinitする方法
  tasks.init();
})();*/

//最後に入力フォームを表示する処理
create_form("input_form");