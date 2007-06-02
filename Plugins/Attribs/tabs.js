// Copyright (c) 2007 Google Inc.

var __tabManagers = [];
var _disable_onblur = false;

var editTabTemplate  = 
'                <table cellpadding="0" cellspacing="0">'
+ '                  <tbody>'
+ '                    <tr>'
+ '                      <td>'
+ '                        <form id="TABID_rename_form" name="TABID_rename_form" style="display: inline;" onsubmit=" __tabManagers[TMID].renameTab();return false;">'
+ '                          <input id="TABID_title" name="TABID_title" value="TABNAME" style="display: block;width: 8em; text-align: center;border:1px;" onblur="_disable_onblur ? void(0) : __tabManagers[TMID].renameTab();">'
+ '                        <\/form>'
+ '                      <\/td>'
+ '                      <td class="mg">'
+ '                        <p class="link" onclick="__tabManagers[TMID].confirmDelete()">'
+ '                           <font size="-2"><nobr>delete<\/nobr><\/font>'
+ '                        <\/p>'
+ '                      <\/td>'
+ '                    <\/tr>'
+ '                  <\/tbody>'
+ '                <\/table>';

var delTabTemplate  = 
'                <table cellpadding="0" cellspacing="0">'
+ '                  <tbody>'
+ '                    <tr>'
+ '                      <td class="mg">'
+ '                        <p class="link" onclick="__tabManagers[TMID].confirmDelete()">'
+ '                           <font size="-2"><nobr>delete<\/nobr><\/font>'
+ '                        <\/p>'
+ '                      <\/td>'
+ '                    <\/tr>'
+ '                  <\/tbody>'
+ '                <\/table>';


function __gel(a) {
    return document.getElementById ? document.getElementById(a) : null;
}



function __hesc(a) {
    a = a.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    a = a.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    a = a.replace(/\\/g,"\\");
    return a;
}

////////////////////////////////////////////////
TabManager.prototype.getEditedTabName = function() {
    return __gel(this.getIdPrefix() + this.currentTabId + "_title").value;
}


TabManager.prototype.getTabHTML = function(a) {
    return __gel(this.getIdPrefix() + a + "_view");
}

TabManager.prototype.renameTab = function() {
    if(!this.isEditingTab) {
         return;
    }

    var a = this.getSelectedTabId();
    var name = this.getEditedTabName();

    // fix up this tab
    if(this.tabs[a].onChangeNameRequest(name)) {
        __gel(this.getIdPrefix() + a + "_view_title").innerHTML = __hesc(this.tabs[a].name);
        this.stopEditTab();
        this.tabs[a].onNameChanged();
    } else {
        this.editTab(this.currentTabId);    
    }
    
    return false;
}


TabManager.prototype.stopEditTab = function() {
    var a = this.getSelectedTabId();
    __gel(this.getIdPrefix()  + a + "_edit").style.display = "none";
    this.getTabHTML(a).style.display = "";
    this.isEditingTab = false;
}

TabManager.prototype.getTabIndex = function(tab) {
    var n = 0;
    while(this.tabs[n] != tab && n < this.tabs.length) n++;

    if(n<this.tabs.length) {
        return n;
    } else {
        return -1;
    }
}

TabManager.prototype.deleteTab = function(id) {

    // tell the tab it's being deleted
    var tab = this.tabs[id];
 
    tab.onPreDestroy();
    
    var tt = this.getTabTable();
    
    // clean up the tab row
    tt.deleteRow(0);

    // clear out the id'th tab from this.tabs[]
    var ttabs = [];
    for(var i=0; i<this.tabCount; i++) {
        if(i != id) ttabs[ttabs.length] = this.tabs[i];
    }
    
    // reset the TabManager
    this.reset();
    
    // update the tabs
    this.tabs = ttabs;
    
    // reshow the whole thing.
    this.reinitTabs(tt);
    this.show();
    
    tab.onPostDestroy();
}

TabManager.prototype.confirmDelete = function() {
    var msg = "Are you sure you want to delete the \"TAB_NAME\" tab and all of its contents?";
    if (confirm(msg.replace(/TAB_NAME/g, this.getEditedTabName()))) {
        this.deleteTab(this.getSelectedTabId());
    } else {
        this.stopEditTab();
    }
}


TabManager.prototype.getSelectedTabClass = function() {
    if(this.tabsOnTop) {
        return "tab selectedtab";
    } else {
        return "tab bottom_selectedtab";
    }
}

TabManager.prototype.getUnselectedTabClass = function() {
    if(this.tabsOnTop) {
        return "tab unselectedtab";
    } else {
        return "tab bottom_unselectedtab";
    }
}

TabManager.prototype.openTab = function(id) {
    for (var i = 0; i < this.tabCount; i++) {
        if(i!=id) {
            this.getTabHTML(i).className = this.getUnselectedTabClass();
        }
    }
    this.getTabHTML(id).className = this.getSelectedTabClass();
    
    if(id != this.getSelectedTabId()) {
        this.tabs[this.getSelectedTabId()].onClosed();
    }
    
    this.currentTabId = id;
    
    var tab = this.tabs[id];
    return tab.onOpened();
}


TabManager.prototype.onTabSelected = function(id,editable) {
    if (this.isTabSelected(id) && editable) {
        this.editTab(id);
    } else {
        this.openTab(id);
    }
}


TabManager.prototype.editTab = function(a) {
    this.currentTabId = a;
    __gel(this.getIdPrefix() + this.currentTabId + "_view").style.display = "none";
    __gel(this.getIdPrefix() + this.currentTabId + "_edit").style.display = "";
    __gel(this.getIdPrefix() + this.currentTabId + "_title").select();
    __gel(this.getIdPrefix() + this.currentTabId + "_title").focus();
    this.isEditingTab = true;
}

TabManager.prototype.getTabTableId = function() {
    return "tabs" + this.tabmanagerId;
}

TabManager.prototype.getTabTable = function() {
    return __gel(this.getTabTableId());
}

TabManager.prototype.getIdPrefix = function() {
    return "tab" + this.tabmanagerId + "__";
}


TabManager.prototype.addTabEntry = function(tabName, editable) {

    var tabmanagerId = this.tabmanagerId;
    tn = this.getIdPrefix() + this.currentTabId;

    tt = this.getTabTable();
    if(tt.rows.length != 1) {
        alert("Error with Table - not enough rows");
        return;
    }
    tr = tt.rows[0];
    var cell = tr.insertCell(tr.cells.length - 2);
    cell.innerHTML = " <img width=\"4\" height=\"1\">";
    cell.className = this.tabsOnTop ? "tabspacer" : "bottom_tabspacer";
    cell = tr.insertCell(tr.cells.length - 2);
    cell.innerHTML = " <img width=\"2\" height=\"1\">" + 
                     " <span id=\"" + tn + 
                     "_view_title\" >" + tabName + 
                     "</span>" + 
                     "<img width=\"2\" height=\"1\">";
                     
    cell.className = "tab " + this.tabsOnTop ? "unselectedtab" : "bottom_unselectedtab";
    cell.id = tn + "_view";
    cell.noWrap = true;
    var n = this.currentTabId;
    this.getTabHTML(this.currentTabId).onclick = function () {__tabManagers[tabmanagerId].onTabSelected(n, editable);};
    
    if(editable) {
        cell = tr.insertCell(tr.cells.length - 2);
        cell.id = tn + "_edit";
        cell.className = "edittab " + this.getSelectedTabClass();
        cell.style.display = "none";
        cell.onclick = function () {var tm=__tabManagers[tabmanagerId]; if (!tm.isEditingTab) tm.getSelectedTabHTML().focus();}
        cell.onmouseover = function () {_disable_onblur = true;};
        cell.onmouseout = function () {_disable_onblur = false;};
        cell.noWrap = true;
        _disable_onblur = false;
        cell.innerHTML = editTabTemplate.
                replace(/TABNAME/g, tabName).
                replace(/TABID/g, tn).
                replace(/TMID/g, tabmanagerId);
    }
}



TabManager.prototype.addTabInternal = function(tabName, editable) {
    this.tabCount++;
    this.currentTabId = this.tabCount - 1;
    this.addTabEntry(tabName, editable);
    this.openTab(this.currentTabId);
}


TabManager.prototype.isTabSelected = function(id) {
    return this.currentTabId == id;
}


TabManager.prototype.getSelectedTabId = function() {
    return this.currentTabId;
}


TabManager.prototype.getSelectedTabHTML = function() {
    return this.getTabHTML(this.currentTabId);
}


TabManager.prototype.reinitTabs = function(table) {
    var tr = table.insertRow(0);
    var tabspacer = tr.insertCell(0); // spacer
    tabspacer.className=this.tabsOnTop ? "tabspacer": "bottom_tabspacer";
    tabspacer.innerHTML = '<img width="4" height="1">';

    // the cell
    var addNewCell = tr.insertCell(1); // add new tab
    addNewCell.align="left";
    addNewCell.noWrap=true;
    addNewCell.width="90%";
    addNewCell.className=this.tabsOnTop ? "tablink":"bottom_tablink";

    // the div
    var addNewDiv = document.createElement("DIV");

    // the span
    var addNewSpan = document.createElement("SPAN");
    addNewSpan.className = "link"
    
    if(this.fAddTabCallback) {
        var thisId = this.tabmanagerId;
        addNewSpan.onclick=function() {__tabManagers[thisId].fAddTabCallback(__tabManagers[thisId]); }
    }
    addNewSpan.innerHTML = this.addTabText ? this.addTabText : "";
    
    // the img
    var addNewImg = document.createElement("IMG");
    addNewImg.width="1"; addNewImg.height="1";
    
    addNewDiv.appendChild(addNewImg);
    addNewDiv.appendChild(addNewSpan);
    addNewCell.appendChild(addNewDiv);  
}

TabManager.prototype.initTabs = function(tabdiv) {
    
    var table = document.createElement("TABLE");
    table.id=this.getTabTableId();
    table.border=0;
    table.cellSpacing=0;
    table.cellPadding=0;
    
    this.reinitTabs(table);
    
    // now add the table to the div
    tabdiv.appendChild(table);
}

TabManager.prototype.reset = function() {
    this.tabs = [];
    this.currentTabId = -1;
    this.tabCount = 0;
    this.isEditingTab = false;
}

////////////////////// PUBLIC METHODS ////////////////////// 
function TabManager(tabdiv) {
    this.tabdiv = tabdiv;
    this.addTabText = "Add Tab...";
    this.fGetName = null;
    this.tabsOnTop = true;
    this.tabmanagerId = __tabManagers.length;
    this.fAddTabCallback = null;
    this.shown = false;
    this.reset();
        
    __tabManagers[__tabManagers.length] = this;
}

TabManager.prototype.setAddTabText = function(txt) {
    this.addTabText = txt;
}

TabManager.prototype.setGetNameFunc = function(fGetName) {
    this.fGetName = fGetName;
}

TabManager.prototype.setAddTabCallback = function(fAddTabCallback) {
    this.fAddTabCallback = fAddTabCallback;
}

TabManager.prototype.show = function() {
    if(!this.shown) {
        this.initTabs(this.tabdiv, this.fGetName);
    }
    for(var i=0; i<this.tabs.length; i++) {
        var tab = this.tabs[i];
        this.addTabInternal(tab.name, tab.isEditable);
    }
    this.shown = true;
}

TabManager.prototype.setTop = function(isTop) {
    this.tabsOnTop = isTop;
}

TabManager.prototype.addTab = function(tab) {
    tab.tabManager = this;
    this.tabs[this.tabs.length] = tab;
}

TabManager.prototype.eraseTab = function(tab) {
    // get the tab id
    id = this.getTabIndex(tab);
    if(id != -1) {
        this.deleteTab(id);
    }
}

TabManager.prototype.getTabCount = function() {
    return this.tabs.length;
}
    
TabManager.prototype.item = function(i) {
    return this.tabs[i];
}

TabManager.prototype.getSelectedTab = function(i) {
    return this.tabs[this.getSelectedTabId()];
}

TabManager.prototype.defaultAddNewTab = function () {
    var tab = new Tab("New Category");
    this.addTab(tab);
    tab.tabManager = this;
    
    this.addTabInternal(tab.name, true);
    this.editTab(this.currentTabId);    
    return tab;
}


function Tab(name) {
    this.name = name;
    this.tabManager = null;
    this.isEditable = true; // default
}

Tab.prototype.setEditable = function(isEditable) {
    this.isEditable = isEditable;
    if(this.tabManager != null) {
        var n = this.tabManager.getTabIndex(this);
        if(n!=-1) {
            var id = this.tabManager.tabmanagerId;
            this.tabManager.getTabHTML(n).onclick = function () {__tabManagers[id].onTabSelected(n, isEditable);};
            this.tabManager.getTabHTML(n).title = this.getHoverMessage();
        }
    }
}

Tab.prototype.onPreDestroy = function() {
}

Tab.prototype.onPostDestroy = function() {
}


Tab.prototype.onOpened = function() {
}

Tab.prototype.onClosed = function() {
}

Tab.prototype.onChangeNameRequest = function(newName) {
    this.name = newName;
    return true;
}

Tab.prototype.getHoverMessage = function() {
    if(this.isEditable) {
        return "Click to rename or delete";
    }
    return "";
}

Tab.prototype.onNameChanged  = function() {
}
