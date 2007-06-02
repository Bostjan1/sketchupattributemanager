# Copyright (c) 2007 Google Inc.
require 'sketchup.rb'

class DataInitializer

    def initialize(use_def_if_available)
        #Sketchup.active_model.start_operation("Attribute Edits");
        ss = Sketchup.active_model.selection
        if(ss.empty? || ss.count != 1)
            $entity = Sketchup.active_model;
        else
            $entity = ss[0];
            if($entity.class == Sketchup::ComponentInstance)
                if(use_def_if_available)
                    $entity = $entity.definition
                elsif(IDYES == UI::messagebox("Use Definition?", MB_YESNO))
                    $entity = $entity.definition
                end
            end
        end
        initStandardTabs();
    end

	def initTextAttrib(dict,name)
		$entity.set_attribute(dict,name,dict+":"+name) if(nil == $entity.get_attribute(dict,name))
	end
    
    def initLinkAttrib(dict,name,url)
		$entity.set_attribute(dict,name,url) if(nil == $entity.get_attribute(dict,name))
	end
    
	def initAuthorTab()
		initTextAttrib("AuthorInfo","name");
		initLinkAttrib("AuthorInfo","email", "mailto://someone@somewhere.com");
        initLinkAttrib("AuthorInfo","link", "http://sketchup.google.com");
	end
    
	def initProductTab()
		initTextAttrib("ProductInfo","brand");
		initTextAttrib("ProductInfo","brand_link");
		initTextAttrib("ProductInfo","link");
		initTextAttrib("ProductInfo","image_link");
		initTextAttrib("ProductInfo","id");
		initTextAttrib("ProductInfo","product_type");
		initTextAttrib("ProductInfo","specification_code");
		initTextAttrib("ProductInfo","specification_standard");
    end
	def initModelTab()
		initTextAttrib("ModelInfo","title");
		initTextAttrib("ModelInfo","description");
		initTextAttrib("ModelInfo","tags");
		initLinkAttrib("ModelInfo","link","http://sketchup.google.com/3dwarehouse");
		initTextAttrib("ModelInfo","warehouse_id");
		initTextAttrib("ModelInfo","last_modified");
	end

	
    
	def initStandardTabs()
		initAuthorTab();
        initModelTab();
        initProductTab();
	end
end

class AttribManagerBase

	def initialize(use_def_if_available)
        @modified = false;
        Sketchup.active_model.start_operation("Attribute Edits");
        ss = Sketchup.active_model.selection
        if(ss.empty? || ss.count != 1)
            $entity = Sketchup.active_model;
        else
            $entity = ss[0];
            if($entity.class == Sketchup::ComponentInstance)
                if(use_def_if_available)
                    $entity = $entity.definition
                elsif(IDYES == UI::messagebox("Use Definition?", MB_YESNO))
                    $entity = $entity.definition
                end
            end
        end
        cleanser = AttributeCleanser.new($entity);
        cleanser.clean();
        

        closed = false;
		$dlg = UI::WebDialog.new("Attribute Manager", true, "AM");
		$dlg.set_file(File.dirname(__FILE__) + "/AttribEditor.html");
		$dlg.add_action_callback("on_cancel") {|d,p| closed=true;Sketchup.active_model.abort_operation(); $dlg.close() }
		$dlg.add_action_callback("on_accept") {|d,p| closed=true;Sketchup.active_model.commit_operation(); $dlg.close() }
		$dlg.add_action_callback("on_close") {|d,p| $dlg.close() }
		$dlg.add_action_callback("on_delete_attribute") {|d,p| deleteAttribute(d, p); }
		$dlg.add_action_callback("on_edit_attribute") {|d,p| editAttribute(d, p); }
		$dlg.add_action_callback("on_add_attribute") {|d,p| addAttribute(d, p); }
		$dlg.add_action_callback("on_delete_dictionary") {|d,p| deleteDictionary(d, p); }
		$dlg.add_action_callback("on_add_dictionary") {|d,p| addDictionary(d, p); }
		$dlg.add_action_callback("create_standard_categories") {|d,p| createStandardCategories(d, p); }
        

        $dlg.set_size 600, 400;
        $dlg.set_on_close {
            check_save() if(!closed)   
        }
        
        showDialog();
    end

    def check_save()
        if(@modified)
            save = UI::messagebox("Save changes?", MB_YESNO);
            if(save==IDNO)
                Sketchup.active_model.abort_operation();
            else
                Sketchup.active_model.commit_operation();
            end
        else
            Sketchup.active_model.abort_operation();
        end
    end
    
    def createStandardCategories(d,p) 
        @modified = true;
        DataInitializer.new($entity);
        json = getJSONDictionaries();
        $dlg.execute_script("initJson('" + json + "', true)");
    end
    
    def fromJSON(str)
        null=nil; 
        eval(str.gsub(/(["'])\s*:\s*(['"0-9tfn\[{])/){"#{$1}=>#{$2}"})
    end
    
	
    def deleteAttribute(d, p)
        @modified = true;
        # extract the dict and name from the parameters
        dict_and_name = fromJSON(p);
        dict = $entity.attribute_dictionaries[dict_and_name["dict_name"]];
        if(dict != nil)
            dict.delete_key dict_and_name["attrib_name"];
        end
    end
    
    def editAttribute(d, p)
        @modified = true;
        params = fromJSON(p);
        dict = $entity.attribute_dictionaries[params["dict_name"]];
        if(dict != nil)
            # delete the existing attribute
            dict.delete_key params["attrib_name"];
            # add it with the new name/value
            dict[ params["attrib_name"] ] = params["attrib_value"];
        end
    end
    
    def addAttribute(d, p)
        @modified = true;
        params = fromJSON(p);
        dict = $entity.attribute_dictionaries[params["dict_name"]];
        if(dict != nil)
            # add it with the new name/value
            dict[ params["attrib_name"] ] = params["attrib_value"];
        end    
    end
    
    def deleteDictionary(d, p)
        @modified = true;
        $entity.attribute_dictionaries.delete p;
    end

    def addDictionary(d, p)
        @modified = true;
        $entity.attribute_dictionary p, true;
    end

    # escapges the characters in the given string so that the
    # resulting string can be used as an argument to a javascript
    # function.
    def escapeChars(s)
        s.gsub('"','\\\\\\"').gsub("'","\\\\'");
    end
    
    def getJSONDictionaries()
        json = '{"dictionaries":[';
        dicts = $entity.attribute_dictionaries
        if(dicts != nil)
            dicts.each do |dict|
                json += '{"name":"' + dict.name + '","attributes":[';
                
                dict.each_key do |attribName|
                    json += '{';
                    json += '"name":"' + attribName + '",';
                    if(dict[attribName].class != Geom::Transformation)
                        json += '"value":"' + escapeChars(dict[attribName].to_s) + '"},';
                    else
                        json += '"value":"' + escapeChars(dict[attribName].to_a.to_s) + '"},';
                    end
                end
                json += ']},'
            end
        end
        json += "]}";
        json.gsub!(/,/,"#COMMA#");
        return json;
    end
    
    def showDialog()
		$dlg.show_modal() {
            json = getJSONDictionaries();
            $dlg.execute_script("initJson('" + json + "')");
		}
    end
    
end

class AttribManagerAll < AttribManagerBase
  	def initialize()
        super(false)
    end
    end

class AttribManagerProduct < AttribManagerBase
  	def initialize()
        super(true)
    end
end

class AttributeCleanser
    def initialize(ent)
        $ent = ent
    end
    
    def clean()
        dicts = []
        toDelete = []
        dictNames = []
        ads = $ent.attribute_dictionaries;
        return if ads == nil;
        i = 0
        ads.each do |d|
            if(dictNames.index(d.name) == nil)
                dicts.push(d)
                dictNames.push(d.name)
            else
                toDelete.push(d)
            end
            i = i + 1
        end
        
        toDelete.each do |d|
            ads.delete d
        end
    end
end

$helpHTML=<<EOHELP    
    <html>
    <body>
    <b>Help for Attribute Manager functions.</b>
    <p>
    This plugin helps you manage the attributes found on the model and 
    entities contained within the model.  
    <p>
    It is accessed in two ways: 
    <ol>
      <li>Via the main menus: <span style="font-family:courier">Tools &gt; Attributes</span>
      The options here apply to the entire model.
      <li>Via context (right click) menus: <span style="font-family:courier">Attributes</span>
      The options here apply to the <em>single</em> selected item.
    </ol>
    <p>
    There are 3 operations possible from the menus - 
    show the attributes, cleanse the attributes of duplicate categories, and 
    make the standard categories.
    <p>
    The <b>Show</b> option will launch a modal dialog that allows you to create and delete 
    attribute categories and add/edit/delete individual attributes.
    <p>
    If an attribute value starts with "http://" or "mailto://" then the value will be displayed 
    without the prefix, but with the link automatically created.
    </body>
    </html>
EOHELP

subMenu = UI::menu("Tools").add_submenu("Attributes");
subMenu.add_item("Show") {
	AttribManagerAll.new
	}

subMenu.add_item("Make standard categories") {
	DataInitializer.new(true)
	}
subMenu.add_item("Remove duplicates") {
    # make sure there is only one of each dictionary of a given name
    ac = AttributeCleanser.new(Sketchup.active_model);
    ac.clean();
}
    
subMenu.add_separator
subMenu.add_item("Help") {
	dlg = UI::WebDialog.new("Attribute Manager Help", true, "AMHelp")
    dlg.set_html($helpHTML)
    dlg.show
	}
    

    
UI::add_context_menu_handler do |menu|
    if(Sketchup.active_model.selection.count == 1)
        menu.add_separator
        subMenu = menu.add_submenu("Attributes");
        
		subMenu.add_item("Show") { 
            AttribManagerProduct.new;
        }
        
        subMenu.add_item("Make standard categories") {
            DataInitializer.new(true)
        }

        subMenu.add_item("Remove duplicates") { 
            AttributeCleanser.new(Sketchup.active_model.selection.first);
        }        
    end
end
