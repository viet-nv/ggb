// eslint-disable no-console, no-control-regex
/*
  @author: GeoGebra - Dynamic Mathematics for Everyone, http://www.geogebra.org
  @license: This file is subject to the GeoGebra Non-Commercial License Agreement, see http://www.geogebra.org/license. For questions please write us at office@geogebra.org.
*/

/*global renderGGBElement, console */
(function() {
if (typeof window.GGBApplet == "function") {
    console.warn("deployggb.js was loaded twice");
    return;
}

var isRenderGGBElementEnabled = false;
var scriptLoadStarted = false;
var html5AppletsToProcess = null;
var ggbHTML5LoadedCodebaseIsWebSimple = false;
var ggbHTML5LoadedCodebaseVersion = null;
var ggbHTML5LoadedScript = null;
var experimentApiUrl = 'https://math.smartschool.edu.vn'

/**
 * @param ggbVersion GeoGebra version; deprecated
 * @param parameters An object containing parameters that are passed to the applet.
 * @param views An object containing information about which views are used in the GeoGebra worksheet. Each variable is boolean.
 *              E.g.: {"is3D":false,"AV":false,"SV":false,"CV":false,"EV2":false,"CP":false,"PC":false,"DA":false,"FI":false,"PV":false,"macro":false};
 * @param html5NoWebSimple Set to true to avoid using web Simple for simple html5 applets. In this case the full version is used always.
 */
var GGBApplet = function() {
    "use strict";
    var applet = {};

    // Define the parameters
    var ggbVersion = '5.0';
    var parameters = {};
    var views = null;
    var html5NoWebSimple = false;
    var html5NoWebSimpleParamExists = false;
    var appletID = null;
    var initComplete = false;
    var html5OverwrittenCodebaseVersion = null;
    var html5OverwrittenCodebase = null;

    for(var i=0; i<arguments.length; i++) {
        var p = arguments[i];
        if (p !== null) {
            switch(typeof(p)) {
                case 'number':
                    ggbVersion = p.toFixed(1);
                    break;
                case 'string':
                    // Check for a version number
                    if (p.match(new RegExp("^[0-9]\\.[0-9]+$"))) {
                        ggbVersion = p;
                    } else {
                        appletID = p;
                    }
                    break;
                case 'object':
                    if (typeof p.is3D !== "undefined") {
                        views = p;
                    } else {
                        parameters = p;
                    }
                    break;
                case 'boolean':
                    html5NoWebSimple = p;
                    html5NoWebSimpleParamExists = true;
                    break;
            }
        }
    }

    if (views === null) {
        views = {"is3D":false,"AV":false,"SV":false,"CV":false,"EV2":false,"CP":false,"PC":false,"DA":false,"FI":false,"PV":false,"macro":false};

        // don't use web simple when material is loaded from tube, because we don't know which views are used.
        if (parameters.material_id !== undefined && !html5NoWebSimpleParamExists) {
            html5NoWebSimple = true;
        }
    }

    if (appletID !== null && parameters.id === undefined) {
        parameters.id = appletID;
    }

    // Private members
    var jnlpFilePath = "";
    var html5Codebase = "";
    var isHTML5Offline = false;
    var loadedAppletType = null;
    var html5CodebaseVersion = null;
    var html5CodebaseScript = null;
    var html5CodebaseIsWebSimple = false;
    var previewImagePath = null;
    var previewLoadingPath = null;
    var previewPlayPath = null;
    var fonts_css_url = null;
    var jnlpBaseDir = null;

    if (parameters.height !== undefined) {
        parameters.height = Math.round(parameters.height);
    }
    if (parameters.width !== undefined) {
        parameters.width = Math.round(parameters.width);
    }
    var parseVersion =function(d){
        return parseFloat(d)>4.0 ? parseFloat(d) : 5;
    };
    /**
     * Overrides the codebase for HTML5.
     * @param codebase Can be an URL or a local file path.
     * @param offline Set to true, if the codebase is a local URL and no web URL
     */
    applet.setHTML5Codebase = function(codebase, offline) {
        html5OverwrittenCodebase = codebase;
        setHTML5CodebaseInternal(codebase, offline);
    };

    /**
     * Java / Compiled codebase settings: not supported, empty implementation for compatibility
     */
    applet.setJavaCodebase = applet.setJavaCodebaseVersion = applet.isCompiledInstalled
        = applet.setPreCompiledScriptPath = applet.setPreCompiledResourcePath = function() {};

    /**
     * Overrides the codebase version for HTML5.
     * If another codebase than the default codebase should be used, this method has to be called before setHTML5Codebase.
     * @param version The version of the codebase that should be used for HTML5 applets.
     */
    applet.setHTML5CodebaseVersion = function(version, offline) {
        var numVersion = parseFloat(version);
        if (numVersion !== NaN && numVersion < 5.0) {
            console.log("The GeoGebra HTML5 codebase version "+numVersion+" is deprecated. Using version latest instead.");
            return;
        } // Version 4.2 is not working properly
        html5OverwrittenCodebaseVersion = version;
        setDefaultHTML5CodebaseForVersion(version, offline);
    };

    applet.getHTML5CodebaseVersion = function() {
        return html5CodebaseVersion;
    };

    applet.getParameters = function() {
        return parameters;
    };

    applet.setFontsCSSURL = function(url) {
        fonts_css_url = url;
    };

    /**
      * This function is not needed anymore. Keep it for downward compatibility of the API.
      */
    applet.setGiacJSURL = function(url) {
    };

    /**
     * Overrides the JNLP file to use.
     * By default (if this method is not called), the jnlp file in the codebase directory is used.
     * Cannot be used in combination with setJNLPBaseDir
     * @param newJnlpFilePath The absolute path to the JNLP file.
     */
    applet.setJNLPFile = function(newJnlpFilePath) {
        jnlpFilePath = newJnlpFilePath;
    };

    /**
     * Sets an alternative base directory for the JNLP File. The path must not include the version number.
     * @param baseDir
     */
    applet.setJNLPBaseDir = function(baseDir) {
        //not needed, for comaptibility only
    };

    /**
     * Injects the applet;
     * @param containerID The id of the HTML element that is the parent of the new applet.
     * All other content (innerText) of the container will be overwritten with the new applet.
     * @param type Can be 'preferJava', 'preferHTML5', 'java', 'html5', 'auto' or 'screenshot'. Default='auto';
     * @param boolean noPreview. Set to true if no preview image should be shown
     * @return The type of the applet that was injected or null if the applet could not be injected.
     */
    applet.inject = function() {
        function isOwnIFrame() {
            return window.frameElement && window.frameElement.getAttribute("data-singleton");
        }

        var type = 'auto';
        var container_ID = parameters.id;
        var container;
        var noPreview = false;
        for(var i=0; i<arguments.length; i++) {
            var p = arguments[i];
            if (typeof(p) === "string") {
                p = p.toLowerCase();
                if (p.match(/^(prefer)?(java|html5|compiled|auto|screenshot)$/)) {
                    type = p;
                } else {
                    container_ID = arguments[i];
                }
            } else if (typeof(p) === "boolean") {
                noPreview = p;
            } else if (p instanceof HTMLElement) {
                container = p;
            }
        }

        continueInject();

        function continueInject() {
            // Check if the initialization is complete
            if (! initComplete) {
                // Try again in 200 ms.
                setTimeout(continueInject, 200);
                return;
            }

            // Use the container id as appletid, if it was not defined.
            type = detectAppletType(type); // Sets the type to either 'java' or 'html5'

            var appletElem = container || document.getElementById(container_ID);

            if (!appletElem) {
                console.log("possibly bug on ajax loading? ");
                return;
            }

            // Remove an existing applet
            applet.removeExistingApplet(appletElem, false);

            // Read the applet dimensions from the container, if they were not defined in the params
            //it is okay, but sadly no height of the container, so we must take care of this too - geogebraweb won't wet widht and height if one if it 0
            if (parameters.width === undefined && appletElem.clientWidth) {
                parameters.width = appletElem.clientWidth;
            }
            if (parameters.height === undefined && appletElem.clientHeight) {
                parameters.height = appletElem.clientHeight;
            }

            if (!(parameters.width && parameters.height) && type === "html5") {
                delete parameters.width;
                delete parameters.height;
            }

            // Inject the new applet
            loadedAppletType = type;
            if (type === "screenshot") {
                injectScreenshot(appletElem, parameters);
            } else {
                // Check if applets should be loaded instantly or with a play button
                var playButton = false;
                if (parameters.hasOwnProperty("playButton") && parameters.playButton || parameters.hasOwnProperty("clickToLoad") && parameters.clickToLoad) {
                    playButton = true;
                } else if (parameters.hasOwnProperty("playButtonAutoDecide") && parameters.playButtonAutoDecide) {
                    playButton = (!isInIframe() || isOwnIFrame())  && isMobileDevice();
                }

                if (playButton) {
                    loadedAppletType = "screenshot";
                    injectPlayButton(appletElem, parameters, noPreview, type);
                } else {
                    injectHTML5Applet(appletElem, parameters, noPreview);
                }
            }
        }

        return;
    };

    function isInIframe () {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    }

    function isMobileDevice() {
        if (parameters.hasOwnProperty("screenshotGenerator") && parameters.screenshotGenerator) {
            return false;
        }
        return (Math.max(screen.width, screen.height) < 800);
    }

    applet.getViews = function() {
        return views;
    };

    /**
     * @returns boolean Whether the system is capable of showing the GeoGebra Java applet
     */
    applet.isJavaInstalled = function() {
        return false;
    };

    var fetchParametersFromApi = function(successCallback) {
        var onSuccess = function(text) {
            var jsonData = JSON.parse(text);
            var isGeoGebra = function(element) {return element.type == 'G' || element.type == 'E'};
            var item = jsonData.data[0] ? jsonData.data[0].elements.filter(isGeoGebra)[0] : undefined;

            if (!item) {
                onError();
                return;
            }

            parameters.fileName = item.url;
            updateAppletSettings(item.settings || {});
            views.is3D = true;

            // user setting of preview URL has precedence
            applet.setPreviewImage(previewImagePath || item.previewUrl, 'https://ggb-smartschool.vercel.app/libs/GeoGebra/img/GeoGebra_loading.png', 'https://ggb-smartschool.vercel.app/libs/GeoGebra/img/applet_play.png');

            successCallback();
        };
        var onError = function(e) {
            parameters.onError && parameters.onError();
            log('Error: Get material (id ' + parameters.material_id + ') failed.', parameters);
        };

        var url = experimentApiUrl + '/api/v1/materials/search';

        sendCorsRequest(
            url,
            'POST',
            {
                'FilterBy': [
                    {
                        'Field': 'id',
                        'Operator': 'eq',
                        'Value': parameters.material_id
                    }
                ]
            },
            onSuccess,
            onError
        );
    };

    function updateAppletSettings(settings) {
        var parameterNames = ['width', 'height', 'showToolBar', 'showMenuBar',
            'showAlgebraInput', 'allowStyleBar', 'showResetIcon', 'enableLabelDrags',
            'enableShiftDragZoom', 'enableRightClick', 'appName'];
        // different defaults in API and web3d
        ['enableLabelDrags', 'enableShiftDragZoom', 'enableRightClick'].forEach(function(name) {
            settings[name] = !!settings[name];
        });
        parameterNames.forEach(function(name) {
             if (parameters[name] === undefined && settings[name] !== undefined) {
                parameters[name] = settings[name];
             }
        });
        if (parameters.showToolBarHelp === undefined) {
            parameters.showToolBarHelp = parameters.showToolBar;
        }
    }

    // Create the XHR object.
    function sendCorsRequest(url, method, body, onSuccess, onError) {
        var xhr = new XMLHttpRequest();
        xhr.open(method, url);
        // Response handlers.
        // xhr.onload = function() {
        //     onSuccess(xhr.responseText);
        // }
        // xhr.onerror = onError;

        xhr.onreadystatechange = function () {
            if (xhr.status === 200) {
                onSuccess(xhr.responseText);
            } else {
               onError();
            }
          }

        xhr.send(JSON.stringify(body));
    }

    /**
     * @returns boolean Whether the system is capable of showing the GeoGebra HTML5 applet
     */
    applet.isHTML5Installed = function() {
        return true;
    };

    /**
     * @returns The type of the loaded applet or null if no applet was loaded yet.
     */
    applet.getLoadedAppletType = function() {
        return loadedAppletType;
    };

    applet.setPreviewImage = function(previewFilePath, loadingFilePath, playFilePath) {
        previewImagePath = previewFilePath;
        previewLoadingPath = loadingFilePath;
        previewPlayPath = playFilePath;
    };

    applet.removeExistingApplet = function(appletParent, showScreenshot) {
        var i;
        if (typeof appletParent === 'string') {
            appletParent = document.getElementById(appletParent);
        }

        loadedAppletType = null;
        var removedID = null;
        for (i=0; i<appletParent.childNodes.length; i++) {
            var currentChild = appletParent.childNodes[i];
            var className = currentChild.className;

            if (className === "applet_screenshot") {
                if (showScreenshot) {
                    // Show the screenshot instead of the removed applet
                    currentChild.style.display = "block";
                    loadedAppletType = "screenshot";
                } else {
                    // Hide the screenshot
                    currentChild.style.display = "none";
                }
            } else if (className !== "applet_scaler prerender") {
                // Remove the applet
                appletParent.removeChild(currentChild);
                removedID = (className && className.indexOf("appletParameters") != -1) ? currentChild.id : null;
                i--;
            }
        }

        var appName = parameters.id !== undefined ? parameters.id : removedID;
        var app = window[appName];

        if (app && typeof app.getBase64 === "function") { // Check if the variable is a GeoGebra Applet and remove it
            app.remove();
            window[appName] = null;
        }
    };

    applet.refreshHitPoints = function() {
        if (parseVersion(ggbHTML5LoadedCodebaseVersion) >= 5.0) {
            return true; // Not necessary anymore in 5.0
        }
        var app = applet.getAppletObject();
        if (app) {
            if (typeof app.recalculateEnvironments === "function") {
                app.recalculateEnvironments();
                return true;
            }
        }
        return false;
    };

    applet.startAnimation = function() {
        var app = applet.getAppletObject();
        if (app) {
            if (typeof app.startAnimation === "function") {
                app.startAnimation();
                return true;
            }
        }
        return false;
    };

    applet.stopAnimation = function() {
        var app = applet.getAppletObject();
        if (app) {
            if (typeof app.stopAnimation === "function") {
                app.stopAnimation();
                return true;
            }
        }
        return false;
    };

    applet.getAppletObject = function() {
        var appName = (parameters.id !== undefined ? parameters.id : "ggbApplet");
        return window[appName];
    };

    applet.resize = function() {};

    var appendParam = function(applet, name, value) {
        var param = document.createElement("param");
        param.setAttribute("name", name);
        param.setAttribute("value", value);
        applet.appendChild(param);
    };

    var valBoolean = function(value) {
        return (value && value !== "false");
    };

    var injectHTML5Applet = function(appletElem, parameters, noPreview) {
        if (parseVersion(html5CodebaseVersion) <= 4.2) {
            noPreview = true;
        }
        // Decide if the script has to be (re)loaded or renderGGBElement can be used to load the applet
        var loadScript = !isRenderGGBElementEnabled && !scriptLoadStarted;
        // Reload the script when not loaded yet, or  currently the wrong version is loaded
        if ((!isRenderGGBElementEnabled && !scriptLoadStarted) || (ggbHTML5LoadedCodebaseVersion !== html5CodebaseVersion || (ggbHTML5LoadedCodebaseIsWebSimple && !html5CodebaseIsWebSimple))) {
            loadScript = true ;
            isRenderGGBElementEnabled = false;
            scriptLoadStarted = false;
        }

        var article = document.createElement("div");
        // don't add geogebraweb here, as we don't want to parse it out of the box.
        article.classList.add("appletParameters", "notranslate");
        var oriWidth = parameters.width;
        var oriHeight = parameters.height;
        parameters.disableAutoScale = parameters.disableAutoScale === undefined ? GGBAppletUtils.isFlexibleWorksheetEditor() : parameters.disableAutoScale;

        // The HTML5 version 4.4 changes the height depending on which bars are shown. So we have to correct it here.
        if (parameters.width !== undefined) {
            if (parseVersion(html5CodebaseVersion) <= 4.4) {
                if (valBoolean(parameters.showToolBar)) {
                    parameters.height -= 7;
                }
                if (valBoolean(parameters.showAlgebraInput)) {
                    parameters.height -= 37;
                }
                if (parameters.width < 605 && valBoolean(parameters.showToolBar)) {
                    parameters.width = 605;
                    oriWidth = 605;
                }
            } else {
                // calculate the minWidth
                var minWidth = 100;
                if (valBoolean(parameters.showToolBar) || valBoolean(parameters.showMenuBar)) {
                    if (parameters.hasOwnProperty("customToolBar")) {
                        parameters.customToolbar = parameters.customToolBar;
                    }
                    minWidth = (valBoolean(parameters.showMenuBar) ? 245 : 155);
                }

                if (oriWidth < minWidth) {
                    parameters.width = minWidth;
                    oriWidth = minWidth;
                }
            }
        }
        article.style.border = 'none';
        article.style.display = 'inline-block';

        for (var key in parameters) {
            if (parameters.hasOwnProperty(key) && key !== "appletOnLoad") {
                article.setAttribute("data-param-"+key, parameters[key]);
            }
        }
        if(fonts_css_url){
            article.setAttribute("data-param-fontscssurl",fonts_css_url);
        }

        // Resize the applet when the window is resized
        applet.resize = function() {
            GGBAppletUtils.responsiveResize(appletElem, parameters);
        };

        window.addEventListener('resize', function(evt) {applet.resize()});

    var oriAppletOnload = (typeof parameters.appletOnLoad === "function") ?
                      parameters.appletOnLoad : function(){};

        // Add the tag for the preview image
        if (!noPreview && parameters.width !== undefined) {

            // Prevent GeoGebraWeb from showing the splash
            if (!parameters.hasOwnProperty('showSplash')) {
                article.setAttribute("data-param-showSplash", 'false');
            }
            // Check if the screenshot is already there
            var previewPositioner = appletElem.querySelector(".applet_scaler.prerender");
            var preRendered = (previewPositioner !== null);

            if (!preRendered) {
                var previewContainer = createScreenShotDiv(oriWidth, oriHeight, parameters.borderColor, false);

                // This div is needed to have an element with position relative as origin for the absolute positioned image
                previewPositioner = document.createElement("div");
                previewPositioner.className = "applet_scaler";
                previewPositioner.style.position = "relative";
                previewPositioner.style.display = 'block';
                previewPositioner.style.width = oriWidth+'px';
                previewPositioner.style.height = oriHeight+'px';
            } else {
                var previewContainer = previewPositioner.querySelector(".ggb_preview");
            }

            if (window.GGBT_spinner) {
                window.GGBT_spinner.attachSpinner(previewPositioner, '66%');
            }

            if (parseVersion(html5CodebaseVersion)>=5.0) {

                // Workaround: Remove the preview image when the applet is fully loaded
                parameters.appletOnLoad = function(api) {
                    var preview = appletElem.querySelector(".ggb_preview");
                    if (preview) {
                        preview.parentNode.removeChild(preview);
                    }
                    if (window.GGBT_spinner) {
                        window.GGBT_spinner.removeSpinner(previewPositioner);
                    }
                    if (window.GGBT_wsf_view) {
                        $(window).trigger("resize");
                    }

                    oriAppletOnload(api);
                };

                if (!preRendered) {
                    previewPositioner.appendChild(previewContainer);
                }
            } else {
                article.appendChild(previewContainer);
            }

            previewPositioner.appendChild(article);
            if (!preRendered) {
                appletElem.appendChild(previewPositioner);
            }

            // Redo resizing when screenshot is loaded to recalculate it after scrollbars are gone
            setTimeout(function() {
                applet.resize();
            }, 1);
        } else {
            var appletScaler = document.createElement("div");
            appletScaler.className = "applet_scaler";
            appletScaler.style.position = "relative";
            appletScaler.style.display = 'block';

            appletScaler.appendChild(article);
            appletElem.appendChild(appletScaler);

            // Apply scaling
            parameters.appletOnLoad = function(api){
                applet.resize();
                oriAppletOnload(api);
            }
        }


        function renderGGBElementWithParams(article, parameters) {
            if (parameters && typeof parameters.appletOnLoad === "function" && typeof renderGGBElement === "function") {
                renderGGBElement(article, parameters.appletOnLoad);
            } else {
                renderGGBElement(article);
            }

            log("GeoGebra HTML5 applet injected and rendered with previously loaded codebase.", parameters);
        }


        function renderGGBElementOnTube(a, parameters) {
            if (typeof renderGGBElement === "undefined") {
                //it is possible, that we get here many times, before script are loaded. So best here to save the article element for later - otherwise only last article processed :-)
                if (html5AppletsToProcess === null) {
                    html5AppletsToProcess = [];
                }
                html5AppletsToProcess.push({
                    article : a,
                    params : parameters
                });
                window.renderGGBElementReady = function() {
                    isRenderGGBElementEnabled = true;
                    if (html5AppletsToProcess !== null && html5AppletsToProcess.length) {
                        html5AppletsToProcess.forEach(function(obj) {
                            renderGGBElementWithParams(obj.article, obj.params);
                        });
                        html5AppletsToProcess = null;
                    }

                };

                //TODO: remove this hack, because it is a hack!
                if (parseVersion(html5CodebaseVersion) < 5.0) {
                        a.className += " geogebraweb";
                }

            } else {
                renderGGBElementWithParams(a, parameters);
            }
        }

        // Load the web script
        if (loadScript) {
            scriptLoadStarted = true;

            // Remove all table tags within an article tag if there are any
            for (var i=0; i<article.childNodes.length;i++) {
                var tag = article.childNodes[i].tagName;
                if (tag === "TABLE") {
                    article.removeChild(article.childNodes[i]);
                    i--;
                }
            }

            // Remove old script tags
            if (ggbHTML5LoadedScript !== null) {
                var el = document.querySelector('script[src="'+ggbHTML5LoadedScript+'"]');
                if (el !== undefined && el !== null) {
                    el.parentNode.removeChild(el);
                }
            }

            var script = document.createElement("script");

            var scriptLoaded = function() {
                renderGGBElementOnTube(article, parameters);
            };

            script.src = html5Codebase + html5CodebaseScript;

            ggbHTML5LoadedCodebaseIsWebSimple = html5CodebaseIsWebSimple;
            ggbHTML5LoadedCodebaseVersion = html5CodebaseVersion;
            ggbHTML5LoadedScript = script.src;
            log("GeoGebra HTML5 codebase loaded: '"+html5Codebase+"'.", parameters);
            if (!html5OverwrittenCodebase && (!html5OverwrittenCodebaseVersion || html5OverwrittenCodebaseVersion == '5.0')) {
                if(html5CodebaseIsWebSimple){
                    webSimple.succeeded = webSimple.succeeded || webSimple();
                }else {
                    web3d.succeeded = web3d.succeeded || web3d();
                }
                scriptLoaded();
            } else if (html5Codebase.requirejs) {
                require(['./HTML5/5.0/web3d/web3d.nocache.js'], scriptLoaded);
            } else {
                script.onload = scriptLoaded;
                appletElem.appendChild(script);
            }
        } else {
            renderGGBElementOnTube(article, parameters);
        }

        parameters.height = oriHeight;
        parameters.width = oriWidth;
    };

    var injectScreenshot = function(appletElem, parameters, showPlayButton) {
        // Add the tag for the preview image
        var previewContainer = createScreenShotDiv(parameters.width, parameters.height, parameters.borderColor, showPlayButton);

        // This div is needed to have an element with position relative as origin for the absolute positioned image
        var previewPositioner = document.createElement("div");
        previewPositioner.style.position = "relative";
        previewPositioner.style.display = 'block';
        previewPositioner.style.width = parameters.width+'px';
        previewPositioner.style.height = parameters.height+'px';
        previewPositioner.className = "applet_screenshot applet_scaler" + (showPlayButton ? " applet_screenshot_play" : "");
        previewPositioner.appendChild(previewContainer);

        var scale = GGBAppletUtils.getScale(parameters, appletElem, showPlayButton);


        if(showPlayButton) {
            appletElem.appendChild(getPlayButton());
            if (!window.GGBT_wsf_view) {
                appletElem.style.position = "relative";
            }
        } else if (window.GGBT_spinner) {
            window.GGBT_spinner.attachSpinner(previewPositioner, '66%');
        }

        appletElem.appendChild(previewPositioner);

        // Set the scale for the preview image
        if (scale !== 1 && !isNaN(scale)) {
            // Set the scale factor for the preview image
            GGBAppletUtils.scaleElement(previewPositioner, scale);
            previewPositioner.style.width = (parameters.width)+'px';
            previewPositioner.style.height = (parameters.height)+'px';
            previewPositioner.parentNode.style.width = (parameters.width*scale)+'px';
            previewPositioner.parentNode.style.height = (parameters.height*scale)+'px';
        }

        applet.resize = function() {
            resizeScreenshot(appletElem, previewContainer, previewPositioner, showPlayButton);
        };

        window.addEventListener('resize', function(evt) {applet.resize()});
        applet.resize();
    };

    function resizeScreenshot(appletElem, previewContainer, previewPositioner, showPlayButton) {
        if (!appletElem.contains(previewContainer)) { // Don't resize the screenshot if it is not visible (anymore)
            return;
        }

        if (typeof window.GGBT_wsf_view === "object" && window.GGBT_wsf_view.isFullscreen()) {
            if (appletElem.id !== "fullscreencontent") {
                return;
            }
            window.GGBT_wsf_view.setCloseBtnPosition(appletElem);
        }

        var scale = GGBAppletUtils.getScale(parameters, appletElem, showPlayButton);

        if (previewPositioner.parentNode !== null) {
            if (!isNaN(scale) && scale !== 1) {
                GGBAppletUtils.scaleElement(previewPositioner, scale);
                previewPositioner.parentNode.style.width = (parameters.width * scale) + 'px';
                previewPositioner.parentNode.style.height = (parameters.height * scale) + 'px';
            } else {
                GGBAppletUtils.scaleElement(previewPositioner, 1);
                previewPositioner.parentNode.style.width = (parameters.width) + 'px';
                previewPositioner.parentNode.style.height = (parameters.height) + 'px';
            }
        }

        // positions the applet in the center of the popup
        if(typeof window.GGBT_wsf_view === 'object' && window.GGBT_wsf_view.isFullscreen()) {
            GGBAppletUtils.positionCenter(appletElem);
        }

        if (typeof window.GGBT_ws_header_footer === "object") {
            window.GGBT_ws_header_footer.setWsScrollerHeight();
        }
    }

    applet.onExitFullscreen = function(fullscreenContainer, appletElem) {
        appletElem.appendChild(fullscreenContainer);
    };

    var injectPlayButton = function(appletElem, parameters, noPreview, type) {
        injectScreenshot (appletElem, parameters, true);

        // Load applet on play button click
        var play = function() {
            // Remove the screenshot after the applet is injected
            var elems = [];
            for (i=0; i<appletElem.childNodes.length;i++) {
                elems.push(appletElem.childNodes[i]);
            }

            if (window.GGBT_wsf_view) {
                var content = window.GGBT_wsf_view.renderFullScreen(appletElem, parameters.id);
                var container = document.getElementById("fullscreencontainer");
                var oldcontent = jQuery(appletElem).find('.fullscreencontent');
                if (oldcontent.length > 0) {
                    // Reuse the previously rendered applet
                    content.remove();
                    oldcontent.attr("id", "fullscreencontent").show();
                    jQuery(container).append(oldcontent);
                    window.dispatchEvent(new Event("resize"));
                } else {
                    // Render a new applet
                    injectHTML5Applet(content, parameters, false);
                }
                window.GGBT_wsf_view.launchFullScreen(container);
            } else {
                loadedAppletType = type;
                injectHTML5Applet(appletElem, parameters, false);
            }

            if (!window.GGBT_wsf_view) {
                for (i = 0; i < elems.length; i++) {
                    appletElem.removeChild(elems[i]);
                }
            }
        };

        // Find the play button and add the click handler
        var imgs = appletElem.getElementsByClassName("ggb_preview_play");
        for (var i = 0; i < imgs.length; i++) {
            imgs[i].addEventListener('click', play, false);
            imgs[i].addEventListener('ontouchstart', play, false);
        }

        // Call onload
        if (typeof window.ggbAppletPlayerOnload === 'function') {
            window.ggbAppletPlayerOnload(appletElem);
        }

        //remove fullscreen button if not needed
        if (isMobileDevice() && window.GGBT_wsf_view) {
            $(".wsf-element-fullscreen-button").remove();
        }
    };

    var getPlayButton = function() {
        var playButtonContainer = document.createElement("div");
        playButtonContainer.className = 'ggb_preview_play icon-applet-play';
        if (!window.GGBT_wsf_view) { // on tube, the play button image is defined in a css file
            var css = '' +
                '.icon-applet-play {' +
                '   width: 100%;' +
                '   height: 100%;box-sizing: border-box;position: absolute;z-index: 1001;cursor: pointer;border-width: 0px;' +
                '   background-color: transparent;background-repeat: no-repeat;left: 0;top: 0;background-position: center center;' +
                '   background-image: url("https://www.geogebra.org/images/worksheet/icon-start-applet.png");' +
                '}' +
                '.icon-applet-play:hover {' +
                        'background-image: url("https://www.geogebra.org/images/worksheet/icon-start-applet-hover.png");' +
                '}';
            var style = document.createElement('style');

            if (style.styleSheet) {
                style.styleSheet.cssText = css;
            } else {
                style.appendChild(document.createTextNode(css));
            }

            document.getElementsByTagName('head')[0].appendChild(style);
        }
        return playButtonContainer;
    };

    var createScreenShotDiv = function(oriWidth, oriHeight, borderColor, showPlayButton) {
        var previewContainer = document.createElement("div");
        previewContainer.className = "ggb_preview";
        previewContainer.style.position = "absolute";
        //previewContainer.style.zIndex = "1000001";
        // too high z-index causes various problems
        // overlaps fixed header
        // overlaps popups
        previewContainer.style.zIndex = "90";
        previewContainer.style.width = oriWidth-2+'px'; // Remove 2 pixel for the border
        previewContainer.style.height = oriHeight-2+'px'; // Remove 2 pixel for the border
        previewContainer.style.top = "0px";
        previewContainer.style.left = "0px";
        previewContainer.style.overflow = "hidden";
        previewContainer.style.backgroundColor = "white";
        var bc = 'lightgrey';
        if (borderColor !== undefined) {
            if (borderColor === "none") {
                bc = "transparent";
            } else {
                bc = borderColor;
            }
        }
        previewContainer.style.border = "1px solid " + bc;

        var preview = document.createElement("img");
        preview.style.position = "relative";
        preview.style.zIndex = "1000";
        preview.style.top = "-1px"; // Move up/left to hide the border on the image
        preview.style.left = "-1px";
        if (previewImagePath !== null) {
            preview.setAttribute("src", previewImagePath);
        }
        preview.style.opacity = 0.7;

        if (previewLoadingPath !== null) {

            var previewOverlay;

            var pWidth, pHeight;
            if (!showPlayButton) {
                previewOverlay = document.createElement("img");
                previewOverlay.style.position = "absolute";
                previewOverlay.style.zIndex = "1001";
                previewOverlay.style.opacity = 1.0;

                preview.style.opacity = 0.3;

                pWidth = 360;
                if (pWidth > (oriWidth/4*3)) {
                    pWidth = oriWidth/4*3;
                }
                pHeight = pWidth/5.8;
                previewOverlay.setAttribute("src", previewLoadingPath);

                previewOverlay.setAttribute("width", pWidth);
                previewOverlay.setAttribute("height", pHeight);
                var pX = (oriWidth - pWidth) / 2;
                var pY = (oriHeight - pHeight) / 2;
                previewOverlay.style.left = pX + "px";
                previewOverlay.style.top = pY + "px";

                previewContainer.appendChild(previewOverlay);
            }
        }

        previewContainer.appendChild(preview);
        return previewContainer;
    };


    /**
     * Detects the type of the applet (java or html5).
     * If a fixed type is passed in preferredType (java or html5), this type is forced.
     * Otherwise the method tries to find out which types are supported by the system.
     * If a preferredType is passed, this type is used if it is supported.
     * If auto is passed, the preferred type is html5 for versions >= 4.4 and java for all versions < 4.4.
     * @param preferredType can be 'preferJava', 'preferHTML5', 'java', 'html5', 'auto' or 'screenshot'. Default='auto'
     */
    var detectAppletType = function(preferredType) {
        preferredType = preferredType.toLowerCase();
        if ((preferredType === "html5") || (preferredType === "screenshot")) {
            return preferredType;
        }

        return "html5";
    };

    var modules = ["web", "webSimple", "web3d", "tablet", "tablet3d", "phone"];
    /**
     * @param version Can be: 3.2, 4.0, 4.2, 4.4, 5.0, test, test42, test44, test50
     */
    var setDefaultHTML5CodebaseForVersion = function(version, offline) {
        html5CodebaseVersion = version;
        if (offline) {
            setHTML5CodebaseInternal(html5CodebaseVersion, true);
            return;
        }

        // Set the codebase URL for the version
        var hasWebSimple = ! html5NoWebSimple;
        if (hasWebSimple) {
            var v = parseVersion(html5CodebaseVersion);
            if ((!isNaN(v) && v < 4.4)) {
                hasWebSimple = false;
            }
        }

        var protocol,
            codebase;
        if (window.location.protocol.substr(0,4) === 'http') {
            protocol = window.location.protocol;
        } else {
            protocol = 'http:';
        }
        var index = html5CodebaseVersion.indexOf("//");
        if (index > 0) {
            codebase = html5CodebaseVersion;
        } else if(index === 0) {
            codebase = protocol + html5CodebaseVersion;
        } else {
            codebase = "./";
        }

        for (var key in modules) {
            if (html5CodebaseVersion.slice(modules[key].length*-1) === modules[key] ||
                html5CodebaseVersion.slice((modules[key].length+1)*-1) === modules[key]+"/") {
                setHTML5CodebaseInternal(codebase, false);
                return;
            }
        }

        // Decide if web, websimple or web3d should be used
        if (!GGBAppletUtils.isFlexibleWorksheetEditor() && hasWebSimple && !views.is3D && !views.AV && !views.SV && !views.CV && !views.EV2 && !views.CP && !views.PC && !views.DA && !views.FI && !views.PV
            && !valBoolean(parameters.showToolBar) && !valBoolean(parameters.showMenuBar) && !valBoolean(parameters.showAlgebraInput)
            && !valBoolean(parameters.enableRightClick) && (!parameters.appName || parameters.appName == "classic")) {
            codebase += 'webSimple/';
        } else {
            codebase += 'web3d/';
        }

        setHTML5CodebaseInternal(codebase, false);
    };

    var setHTML5CodebaseInternal = function(codebase, offline) {
        if(codebase.requirejs){
             html5Codebase = codebase;
             return;
        }
        if (codebase.slice(-1) !== '/') {
            codebase += '/';
        }
        html5Codebase = codebase;

        if (offline === null) {
            offline = (codebase.indexOf("http") === -1);
        }
        isHTML5Offline = offline;

        // Set the scriptname (web or webSimple)
        html5CodebaseScript = "web.nocache.js";
        html5CodebaseIsWebSimple = false;
        var folders = html5Codebase.split("/");
        if (folders.length > 1) {
            if (! offline && folders[folders.length-2] === 'webSimple') {  // Currently we don't use webSimple for offline worksheets
                html5CodebaseScript = "webSimple.nocache.js";
                html5CodebaseIsWebSimple = true;
            } else if (modules.indexOf(folders[folders.length-2]) >= 0) {
                html5CodebaseScript = folders[folders.length-2] + ".nocache.js";
            }
        }

        // Extract the version from the codebase folder
        folders = codebase.split('/');
        html5CodebaseVersion = folders[folders.length-3];
        if (html5CodebaseVersion.substr(0,4) === 'test') {
            html5CodebaseVersion = html5CodebaseVersion.substr(4,1) + '.' + html5CodebaseVersion.substr(5,1);
        } else if (html5CodebaseVersion.substr(0,3) === 'war' || html5CodebaseVersion.substr(0,4) === 'beta') {
            html5CodebaseVersion = '5.0';
        }

        // Check if the codebase version is deprecated
        var numVersion = parseFloat(html5CodebaseVersion);
        // codebases like web.geogebra.org/4.2 no longer supported
        if (numVersion !== NaN && numVersion < 5.0 && codebase.indexOf("geogebra.org") >= 0) {
            console.log("The GeoGebra HTML5 codebase version "+numVersion+" is deprecated. Using version latest instead.");
            setDefaultHTML5CodebaseForVersion("5.0", offline);
        }
    };

    var log = function(text, parameters) {
        if ( window.console && window.console.log ) {
            if(!parameters || (typeof parameters.showLogging === 'undefined') ||
                (parameters.showLogging && parameters.showLogging !== "false")) {
                    console.log(text);
            }
        }
    };

    // Read the material parameters from the tube API, if a material_id was passed
    if (parameters.material_id !== undefined) {
        fetchParametersFromApi(continueInit);
    } else {
        continueInit();
    }

    function continueInit() {
        var html5Version = ggbVersion;
        if (html5OverwrittenCodebaseVersion !== null) {
            html5Version = html5OverwrittenCodebaseVersion;
        } else {
            if (parseFloat(html5Version) < 5.0) { // Use 5.0 as default for html5. Change the version number here, when a new stable version is released.
                html5Version = "5.0";
            }
        }

        // Initialize the codebase with the default URLs
        setDefaultHTML5CodebaseForVersion(html5Version, false);

        if (html5OverwrittenCodebase !== null) {
            setHTML5CodebaseInternal(html5OverwrittenCodebase, isHTML5Offline);
        }
        initComplete = true;
    }

    return applet;
};

var GGBAppletUtils = (function() {
    "use strict";

    function isFlexibleWorksheetEditor() {
        return (window.GGBT_wsf_edit !== undefined);
    }

    function scaleElement(el, scale){
        if (scale != 1) {
            el.style.transformOrigin = "0% 0% 0px";
            el.style.webkitTransformOrigin = "0% 0% 0px";
            el.style.transform = "scale(" + scale + "," + scale + ")";
            el.style.webkitTransform = "scale(" + scale + "," + scale + ")";
            el.style.maxWidth = "initial";
            // Remove the max width from the image and the div
            if (el.querySelector(".ggb_preview") !== null) {
                el.querySelector(".ggb_preview").style.maxWidth = "initial";
            }
            if (el.querySelectorAll('.ggb_preview img')[0] !== undefined) {
              el.querySelectorAll('.ggb_preview img')[0].style.maxWidth = "initial";
            }
            if (el.querySelectorAll('.ggb_preview img')[1] !== undefined) {
              el.querySelectorAll('.ggb_preview img')[1].style.maxWidth = "initial"
            }
        } else {
            el.style.transform = "none";
            el.style.webkitTransform = "none";
        }
    }

    function getWidthHeight(appletElem, appletWidth, allowUpscale, autoHeight, noBorder, scaleContainerClass) {
        // Find the container class
        var container = null;
        if (scaleContainerClass != undefined && scaleContainerClass != '') {
            var parent = appletElem.parentNode;
            while(parent != null) {
                if ((' ' + parent.className + ' ').indexOf(' ' + scaleContainerClass + ' ') > -1) {
                    container = parent;
                    break;
                } else {
                    parent = parent.parentNode;
                }
            }
        }

        var myWidth = 0, myHeight = 0, windowWidth = 0, border = 0, borderRight = 0, borderLeft = 0, borderTop = 0;

        if (container) {
            myWidth = container.offsetWidth;
            myHeight = Math.max(autoHeight ? container.offsetWidth : 0, container.offsetHeight);
        } else {
            if (window.innerWidth && document.documentElement.clientWidth) {
                myWidth = Math.min(window.innerWidth, document.documentElement.clientWidth);
                myHeight = Math.min(window.innerHeight, document.documentElement.clientHeight);
                // Using mywith instead of innerWidth because after rotating a mobile device the innerWidth is sometimes wrong (e.g. on Galaxy Note III)
                // windowWidth = window.innerWidth
                windowWidth = myWidth;
            } else {
                //Non-IE
                myWidth = window.innerWidth;
                myHeight = window.innerHeight;
                windowWidth = window.innerWidth;
            }

            if (appletElem) {
                var rect = appletElem.getBoundingClientRect();
                if (rect.left > 0) {
                    if (rect.left <= myWidth && (noBorder === undefined || !noBorder)) {
                        if (document.dir === 'rtl') {
                            borderRight = myWidth - rect.width - rect.left;
                            borderLeft = (windowWidth <= 480 ? 10 : 30);
                        } else {
                            borderLeft = rect.left;
                            borderRight = (windowWidth <= 480 ? 10 : 30);
                        }
                        border = borderLeft + borderRight;
                    }
                }
            }

            // overwrite borders with other numbers if it is in fullscreen mode
            // make sure X is visible all the time
            if(appletElem && typeof window.GGBT_wsf_view === "object" && window.GGBT_wsf_view.isFullscreen()) {
                // APPLET IS DISPLAYED IN FULLSCREEN
                var appletRect = appletElem.getBoundingClientRect();

                // X is positioned to the right/left
                // set a border so it is visible
                if(window.GGBT_wsf_view.getCloseBtnPosition() === 'closePositionRight') {
                    // X is positioned to the right/left
                    // 40 is the width of the X close button
                    border = 40;
                    borderTop = 0;
                } else if(window.GGBT_wsf_view.getCloseBtnPosition() === 'closePositionTop') {
                    // X is positioned on top
                    border = 0;
                    borderTop = 40;
                }
            }
        }

        if (appletElem) {
            if ((allowUpscale === undefined || !allowUpscale) && appletWidth > 0 && appletWidth + border < myWidth) {
                myWidth = appletWidth;
            } else {
                myWidth -= border;
            }

            if(typeof window.GGBT_wsf_view === "object" && window.GGBT_wsf_view.isFullscreen() && (allowUpscale === undefined || !allowUpscale)) {
                // applet is displayed in fullscreen
                myHeight -= borderTop;
            }
        }

        return {width: myWidth, height: myHeight};
    }

    function calcScale(parameters, appletElem, allowUpscale, showPlayButton, scaleContainerClass){
        if (parameters.isScreenshoGenerator) {
            return 1;
        }
        var ignoreHeight = (showPlayButton !== undefined && showPlayButton);
        var noScaleMargin = parameters.noScaleMargin != undefined && parameters.noScaleMargin;
        var valBoolean = function(value) {
            return (value && value !== "false");
        };
        var autoHeight = valBoolean(parameters.autoHeight);
        var windowSize = getWidthHeight(appletElem, parameters.width, allowUpscale, autoHeight, (ignoreHeight && window.GGBT_wsf_view) || noScaleMargin, scaleContainerClass);
        var windowWidth = parseInt(windowSize.width);

        var appletWidth = parameters.width;
        var appletHeight = parameters.height;
        if (appletWidth === undefined) {
            var article = appletElem.querySelector('.appletParameters');
            if (article) {
                appletWidth = article.offsetWidth;
                appletHeight = article.offsetHeight;
            }
        }

        var xscale = windowWidth / appletWidth;
        var yscale = (ignoreHeight ? 1 : windowSize.height / appletHeight);
        if (allowUpscale !== undefined && !allowUpscale) {
            xscale = Math.min(1, xscale);
            yscale = Math.min(1, yscale);
        }

        return Math.min(xscale, yscale);
    }

    function getScale(parameters, appletElem, showPlayButton) {
        var scale = 1,
            autoScale,
            allowUpscale = false;

        if (parameters.hasOwnProperty('allowUpscale')) {
            allowUpscale = parameters.allowUpscale;
        }

        if (parameters.hasOwnProperty('scale')) {
            scale = parseFloat(parameters.scale);
            if (isNaN(scale) || scale === null || scale === 0) {
                scale = 1;
            }
            if (scale > 1) {
                allowUpscale = true;
            }
        }

        if(appletElem && typeof window.GGBT_wsf_view === "object" && window.GGBT_wsf_view.isFullscreen()) {
            allowUpscale = true;
        }

        if (!(parameters.hasOwnProperty('disableAutoScale') && parameters.disableAutoScale)) {
            autoScale = calcScale(parameters, appletElem, allowUpscale, showPlayButton, parameters.scaleContainerClass);
        } else {
            return scale;
        }

        if (allowUpscale && (!parameters.hasOwnProperty('scale') || scale === 1)) {
            return autoScale;
        } else {
            return Math.min(scale, autoScale);
        }
    }

    /**
     * Positiones the applet in the center of the screen
     * Used for fullscreen popups
     * @param appletElem
     */
    function positionCenter(appletElem) {
        var windowWidth = Math.min(window.innerWidth, document.documentElement.clientWidth);
        var windowHeight = Math.min(window.innerHeight, document.documentElement.clientHeight);
        var appletRect = appletElem.getBoundingClientRect();

        var calcHorizontalBorder = (windowWidth - appletRect.width) / 2;
        var calcVerticalBorder = (windowHeight - appletRect.height) / 2;

        if(calcVerticalBorder < 0) {
            calcVerticalBorder = 0;
        }

        appletElem.style.position = "relative";

        if(window.GGBT_wsf_view.getCloseBtnPosition() === 'closePositionRight') {
            // X is positioned to the right/left

            if(calcHorizontalBorder < 40) {
                // if there is not enough space left for the X, don't position it in the center
                appletElem.style.left = '40px';
            } else {
                appletElem.style.left = calcHorizontalBorder + 'px';
            }
            appletElem.style.top = calcVerticalBorder + 'px';

        } else if(window.GGBT_wsf_view.getCloseBtnPosition() === 'closePositionTop') {
            // X is positioned on top

            if(calcVerticalBorder < 40) {
                // if there is not enough space left for the X, don't position it in the center
                appletElem.style.top = '40px';
            } else {
                appletElem.style.top = calcVerticalBorder + 'px';
            }

            appletElem.style.left = calcHorizontalBorder + 'px';
        }
    }

    function responsiveResize(appletElem, parameters) {
        var article = appletElem.querySelector(".appletParameters");

        if (article) {
            if (typeof window.GGBT_wsf_view === "object" && window.GGBT_wsf_view.isFullscreen()) {
                if (parameters.id !== article.getAttribute("data-param-id")) {
                    return;
                }

                window.GGBT_wsf_view.setCloseBtnPosition(appletElem);
            }

            if(article.parentElement && (/fullscreen/).test(article.parentElement.className)){
                return; //fullscreen button inside applet pressed
            }

            var scale = getScale(parameters, appletElem);

            if (isFlexibleWorksheetEditor()) {
                article.setAttribute("data-param-scale", scale);
            }

            var scaleElem = null;
            for (var i = 0; i < appletElem.childNodes.length; i++) {
                if (appletElem.childNodes[i].className !== undefined && appletElem.childNodes[i].className.match(/^applet_scaler/)) {
                    scaleElem = appletElem.childNodes[i];
                    break;
                }
            }

            if (scaleElem !== null && scaleElem.querySelector(".noscale") !== null) {
                return;
            }

            var appName = (parameters.id !== undefined ? parameters.id : "ggbApplet");
            var app = window[appName];

            if ((app == null || !app.recalculateEnvironments) && scaleElem !== null && !scaleElem.className.match(/fullscreen/)) {
                scaleElem.parentNode.style.transform = "";
                if (!isNaN(scale) && scale !== 1) {
                    // Set the scale factor for the applet
                    scaleElem.parentNode.style.width = (parameters.width * scale) + 'px';
                    scaleElem.parentNode.style.height = (parameters.height * scale) + 'px';
                    scaleElement(scaleElem, scale);

                } else {
                    // Remove scaling
                    scaleElement(scaleElem, 1);
                    scaleElem.parentNode.style.width = (parameters.width) + 'px';
                    scaleElem.parentNode.style.height = (parameters.height) + 'px';
                }
            }
            // positions the applet in the center of the popup
            if (typeof window.GGBT_wsf_view === 'object' && window.GGBT_wsf_view.isFullscreen()) {
                positionCenter(appletElem);
            }

            if (window.GGBT_wsf_view && !window.GGBT_wsf_view.isFullscreen()) {
                window.GGBT_wsf_general.adjustContentToResize($(article).parents('.content-added-content'));
            }
        }
    }

    return {
        responsiveResize: responsiveResize,
        isFlexibleWorksheetEditor: isFlexibleWorksheetEditor,
        positionCenter: positionCenter,
        getScale: getScale,
        scaleElement: scaleElement
    };
})();

if(typeof define === "function" && define.amd){
    define([], function(){ return GGBApplet; })
}

GGBAppletUtils.makeModule = function(name, permutation) {
    function webModule() {
        var H = 'bootstrap',
            I = 'begin',
            J = 'gwt.codesvr.'+name+'=',
            K = 'gwt.codesvr=',
            L = name,
            M = 'startup',
            N = 'DUMMY',
            O = 0,
            P = 1,
            Q = 'iframe',
            R = 'position:absolute; width:0; height:0; border:none; left: -1000px;',
            S = ' top: -1000px;',
            T = 'Chrome',
            U = 'CSS1Compat',
            V = '<!doctype html>',
            W = '',
            X = '<html><head><\/head><body><\/body><\/html>',
            Y = 'undefined',
            Z = 'readystatechange',
            $ = 10,
            _ = 'script',
            ab = 'javascript',
            bb = 'Failed to load ',
            cb = 'moduleStartup',
            db = 'scriptTagAdded',
            eb = 'moduleRequested',
            fb = 'meta',
            gb = 'name',
            hb = name + '::',
            ib = '::',
            jb = 'gwt:property',
            kb = 'content',
            lb = '=',
            mb = 'gwt:onPropertyErrorFn',
            nb = 'Bad handler "',
            ob = '" for "gwt:onPropertyErrorFn"',
            pb = 'gwt:onLoadErrorFn',
            qb = '" for "gwt:onLoadErrorFn"',
            rb = '#',
            sb = '?',
            tb = '/',
            ub = 'img',
            vb = 'clear.cache.gif',
            wb = 'baseUrl',
            xb = name + '.nocache.js',
            yb = 'base',
            zb = '//',
            Ab = 'selectingPermutation',
            Bb = name + '.devmode.js',
            Cb = permutation,
            Db = ':',
            Eb = '.cache.js',
            Fb = 'loadExternalRefs',
            Gb = 'end';
        var n = window;
        var o = document;
        q(H, I);

        function p() {
            var a = n.location.search;
            return a.indexOf(J) != -1 || a.indexOf(K) != -1
        }

        function q(a, b) {

        }
        webModule.__sendStats = q;
        webModule.__moduleName = L;
        webModule.__errFn = null;
        webModule.__moduleBase = N;
        webModule.__softPermutationId = O;
        webModule.__computePropValue = null;
        webModule.__getPropMap = null;
        webModule.__installRunAsyncCode = function() {};
        webModule.__gwtStartLoadingFragment = function() {
            return null
        };
        webModule.__gwt_isKnownPropertyValue = function() {
            return false
        };
        webModule.__gwt_getMetaProperty = function() {
            return null
        };
        var r = null;
        var s = n.__gwt_activeModules = n.__gwt_activeModules || {};
        s[L] = {
            moduleName: L
        };
        webModule.__moduleStartupDone = function(e) {
            var f = s[L].bindings;
            s[L].bindings = function() {
                var a = f ? f() : {};
                var b = e[webModule.__softPermutationId];
                for (var c = O; c < b.length; c++) {
                    var d = b[c];
                    a[d[O]] = d[P]
                }
                return a
            }
        };
        var t;
        function u() {
            v();
            return t
        }

        function v() {
            if (t) {
                return
            }
            var a = o.createElement(Q);
            a.id = L;
            a.style.cssText = R + S;
            a.tabIndex = -1;
            o.body.appendChild(a);
            t = a.contentWindow.document;
            if (navigator.userAgent.indexOf(T) == -1) {
                t.open();
                var b = document.compatMode == U ? V : W;
                t.write(b + X);
                t.close()
            }
        }

        function w(f) {
            function g(a) {
                function b() {
                    if (typeof o.readyState == Y) {
                        return typeof o.body != Y && o.body != null
                    }
                    return /loaded|complete/.test(o.readyState)
                }
                var c = b();
                if (c) {
                    a();
                    return
                }
                function d() {
                    if (!c) {
                        if (!b()) {
                            return
                        }
                        c = true;
                        a();
                        if (o.removeEventListener) {
                            o.removeEventListener(Z, d, false)
                        }
                        if (e) {
                            clearInterval(e)
                        }
                    }
                }
                if (o.addEventListener) {
                    o.addEventListener(Z, d, false)
                }
                var e = setInterval(function() {
                    d()
                }, $)
            }

            function h(a) {
                var b = u();
                var c = b.body;
                var d = b.createElement(_);
                d.language = ab;
                d.crossOrigin = W;
                d.src = a;
                if (webModule.__errFn) {
                    d.onerror = function() {
                        webModule.__errFn(L, new Error(bb + a))
                    }
                }
                c.appendChild(d);
                q(cb, db)
            }
            q(cb, eb);
            g(function() {
                h(f)
            })
        }
        webModule.__startLoadingFragment = function(a) {
            return C(a)
        };
        webModule.__installRunAsyncCode = function(a) {
            var b = u();
            var c = b.body;
            var d = b.createElement(_);
            d.language = ab;
            d.text = a;
            c.appendChild(d);
            c.removeChild(d)
        };

        function A() {
            var c = {};
            var d;
            var e;
            var f = o.getElementsByTagName(fb);
            for (var g = O, h = f.length; g < h; ++g) {
                var i = f[g],
                    j = i.getAttribute(gb),
                    k;
                if (j) {
                    j = j.replace(hb, W);
                    if (j.indexOf(ib) >= O) {
                        continue
                    }
                    if (j == jb) {
                        k = i.getAttribute(kb);
                        if (k) {
                            var l, m = k.indexOf(lb);
                            if (m >= O) {
                                j = k.substring(O, m);
                                l = k.substring(m + P)
                            } else {
                                j = k;
                                l = W
                            }
                            c[j] = l
                        }
                    } else if (j == mb) {
                        k = i.getAttribute(kb);
                        if (k) {
                            try {
                                d = eval(k)
                            } catch (a) {
                                alert(nb + k + ob)
                            }
                        }
                    } else if (j == pb) {
                        k = i.getAttribute(kb);
                        if (k) {
                            try {
                                e = eval(k)
                            } catch (a) {
                                alert(nb + k + qb)
                            }
                        }
                    }
                }
            }
            __gwt_getMetaProperty = function(a) {
                var b = c[a];
                return b == null ? null : b
            };
            r = d;
            webModule.__errFn = e
        }

        function B() {
            function e(a) {
                var b = a.lastIndexOf(rb);
                if (b == -1) {
                    b = a.length
                }
                var c = a.indexOf(sb);
                if (c == -1) {
                    c = a.length
                }
                var d = a.lastIndexOf(tb, Math.min(c, b));
                return d >= O ? a.substring(O, d + P) : W
            }
            function f(a) {
                if (a.match(/^\w+:\/\//)) {} else {
                    var b = o.createElement(ub);
                    b.src = a + vb;
                    a = e(b.src)
                }
                return a
            }
            function g() {
                var a = __gwt_getMetaProperty(wb);
                if (a != null) {
                    return a
                }
                return W
            }
            function h() {
                var a = o.getElementsByTagName(_);
                for (var b = O; b < a.length; ++b) {
                    if (a[b].src.indexOf(xb) != -1) {
                        return e(a[b].src)
                    }
                }
                return W
            }
            function i() {
                var a = o.getElementsByTagName(yb);
                if (a.length > O) {
                    return a[a.length - P].href
                }
                return W
            }
            function j() {
                var a = o.location;
                return a.href == a.protocol + zb + a.host + a.pathname + a.search + a.hash
            }
            var k = g();
            if (k == W) {
                k = h()
            }
            if (k == W) {
                k = i()
            }
            if (k == W && j()) {
                k = e(o.location.href)
            }
            k = f(k);
            return k
        }

        function C(a) {
            if (a.match(/^\//)) {
                return a
            }
            if (a.match(/^[a-zA-Z]+:\/\//)) {
                return a
            }
            return webModule.__moduleBase + a
        }

        function D() {
            var f = [];
            var g = O;
            var h = [];
            var i = [];

            function j(a) {
                var b = i[a](),
                    c = h[a];
                if (b in c) {
                    return b
                }
                var d = [];
                for (var e in c) {
                    d[c[e]] = e
                }
                if (r) {
                    r(a, d, b)
                }
                throw null
            }
            __gwt_isKnownPropertyValue = function(a, b) {
                return b in h[a]
            };
            webModule.__getPropMap = function() {
                var a = {};
                for (var b in h) {
                    if (h.hasOwnProperty(b)) {
                        a[b] = j(b)
                    }
                }
                return a
            };
            webModule.__computePropValue = j;
            n.__gwt_activeModules[L].bindings = webModule.__getPropMap;

            if (p()) {
                return C(Bb)
            }
            var k;
            try {
                k = Cb;
                var l = k.indexOf(Db);
                if (l != -1) {
                    g = parseInt(k.substring(l + P), $);
                    k = k.substring(O, l)
                }
            } catch (a) {}
            webModule.__softPermutationId = g;
            return C(k + Eb)
        }

        function F() {
            if (!n.__gwt_stylesLoaded) {
                n.__gwt_stylesLoaded = {}
            }
        }
        A();
        webModule.__moduleBase = "https://ggb-smartschool.vercel.app/libs/GeoGebra/HTML5/5.0/" + name + "/";
        s[L].moduleBase = webModule.__moduleBase;
        var G = D();
        F();

        w(G);
        return true
    }
    return webModule;
}
if (typeof window.web3d !== "function") {
    window.web3d = GGBAppletUtils.makeModule("web3d","5F976CA55ACDC63E342C55B848B768B9");
}
if (typeof window.webSimple !== "function") {
    window.webSimple = GGBAppletUtils.makeModule("webSimple",'DC0558508FD2BD5F33E98C14DC2A0A9A');
}
window.GGBApplet = GGBApplet;
})();
