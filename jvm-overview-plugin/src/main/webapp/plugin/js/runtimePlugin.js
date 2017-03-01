/**
 * @module Runtime
 * 
 * The main entry point for the Runtime module
 * 
 */
var Runtime = (function(Runtime) {

	/**
	 * @property pluginName
	 * @type {string}
	 * 
	 * The name of this plugin
	 */
	Runtime.pluginName = 'runtime_plugin';

	/**
	 * @property log
	 * @type {Logging.Logger}
	 * 
	 * This plugin's logger instance
	 */
	Runtime.log = Logger.get('Runtime');

	/**
	 * @property contextPath
	 * @type {string}
	 * 
	 * The top level path of this plugin on the server
	 * 
	 */
	Runtime.contextPath = "${contextPath}";

	/**
	 * @property templatePath
	 * @type {string}
	 * 
	 * The path to this plugin's partials
	 */
	Runtime.templatePath = Runtime.contextPath + "plugin/html/";

	/**
	 * @property module
	 * @type {object}
	 * 
	 * This plugin's angularjs module instance. This plugin only needs
	 * hawtioCore to run, which provides services like workspace, viewRegistry
	 * and layoutFull used by the run function
	 */
	Runtime.module = angular.module('runtime_plugin', [ 'hawtioCore' ]).config(
		function($routeProvider) {

			/**
			 * Here we define the route for our plugin. One note is to avoid
			 * using 'otherwise', as hawtio has a handler in place when a
			 * route doesn't match any routes that routeProvider has been
			 * configured with.
			 */
			$routeProvider.when('/runtime_plugin', {
				templateUrl : Runtime.templatePath + 'runtime.html'
			});
		});

	/**
	 * Here we define any initialization to be done when this angular module is
	 * bootstrapped. In here we do a number of things:
	 * 
	 * 1. We log that we've been loaded (kinda optional) 2. We load our .css
	 * file for our views 3. We configure the viewRegistry service from hawtio
	 * for our route; in this case we use a pre-defined layout that uses the
	 * full viewing area 4. We configure our top-level tab and provide a link to
	 * our plugin. This is just a matter of adding to the workspace's
	 * topLevelTabs array.
	 */
	Runtime.module.run(function(workspace, viewRegistry, layoutFull) {

		Runtime.log.info(Runtime.pluginName, " loaded");

		Core.addCSS(Runtime.contextPath + "plugin/css/runtime.css");

		// tell the app to use the full layout, also could use layoutTree
		// to get the JMX tree or provide a URL to a custom layout
		viewRegistry["runtime_plugin"] = layoutFull;

		/*
		 * Set up top-level link to our plugin. Requires an object with the
		 * following attributes:
		 * 
		 * id - the ID of this plugin, used by the perspective plugin and by the
		 * preferences page content - The text or HTML that should be shown in
		 * the tab title - This will be the tab's tooltip isValid - A function
		 * that returns whether or not this plugin has functionality that can be
		 * used for the current JVM. The workspace object is passed in by
		 * hawtio's navbar controller which lets you inspect the JMX tree,
		 * however you can do any checking necessary and return a boolean href -
		 * a function that returns a link, normally you'd return a hash link
		 * like #/foo/bar but you can also return a full URL to some other site
		 * isActive - Called by hawtio's navbar to see if the current
		 * $location.url() matches up with this plugin. Here we use a helper
		 * from workspace that checks if $location.url() starts with our route.
		 */
		workspace.topLevelTabs.push({
			id : "runtime",
			content : "Runtime",
			title : "Java Runtime Process Information",
			isValid : function(workspace) {
				return true;
			},
			href : function() {
				return "#/runtime_plugin";
			},
			isActive : function(workspace) {
				return workspace.isLinkActive("runtime_plugin");
			}
		});

	});

	/**
	 * @function RuntimeController
	 * @param $scope
	 * @param jolokia
	 * 
	 * The controller for runtime.html, only requires the jolokia service from
	 * hawtioCore
	 * 
	 */
	Runtime.RuntimeController = function($scope, jolokia, workspace) {
		$scope.supportsMemoryOperations = workspace.treeContainsDomainAndProperties('com.sun.management', {type: 'DiagnosticCommand'});
		var supportsClassStats = false;
		$scope.hello = "Hello world!";

		$scope.gridOptions=setupGridOptions();

		// register a watch with jolokia on this mbean to
		// get updated metrics
		Core.register(jolokia, $scope, {
			type : 'read',
			mbean : 'java.lang:type=Runtime',
			arguments : []
		}, onSuccess(render));
				
		function reconstructCommandLine(runtime) {
			var commandLine='';
			var javaHome = runtime.SystemProperties['java.home'];
			if(javaHome) {
				var fileSeparator = runtime.SystemProperties['file.separator'];
				commandLine += javaHome + fileSeparator + 'bin' + fileSeparator;
			} 
			commandLine += 'java ';
			
			for(vmArg in  runtime.InputArguments){
				commandLine += escapeSpaces(runtime.InputArguments[vmArg]) + ' ';
			}
			commandLine += '-classpath ' + runtime.SystemProperties['java.class.path'] + ' ';
			commandLine += runtime.SystemProperties['sun.java.command'];
			return commandLine;
		}
		
		function escapeSpaces(string) {
			return string.replace(/ /g, '\\ ');
		}

		// update display of metric
		function render(response) {
			$scope.vmName = response.value['VmName'];
			$scope.version = response.value['SpecVersion'];
			$scope.build = response.value['VmVersion'];
			$scope.vendor = response.value['VmVendor'];
			$scope.os = response.value.SystemProperties['os.name'];
			$scope.osVersion = response.value.SystemProperties['os.version'];
			$scope.architecture = response.value.SystemProperties['os.arch'];
			$scope.user = response.value.SystemProperties['user.name'];
			var regex = /(\d+)@(.+)/g;
			var pidAndHost = regex.exec(response.value.Name);
			$scope.pid = pidAndHost[1];
			$scope.host = pidAndHost[2];
			$scope.startTime = response.value['StartTime'];
			$scope.upTime = response.value['Uptime'];
			$scope.commandLine = reconstructCommandLine(response.value);
			$scope.workingDirectory = response.value.SystemProperties['user.dir'];
			
			//system property table
			$scope.showFilterBar = true;
			$scope.systemPropertiesTable = {
				properties : {}
			};
			$scope.systemProperties = [];

			var systemProperties = response.value['SystemProperties'];

			for (property in systemProperties) {

				if (systemProperties.hasOwnProperty(property)) {
					$scope.systemProperties.push( {name: property, value: systemProperties[property]})
				}
			} 
			

			Core.$apply($scope);
		}

		function setupGridOptions() {
			
			return {
				selectedItems : [],
				data : 'systemProperties',
				showFilter : true,
				filterOptions : {
					filterText : ''
				},
				showSelectionCheckbox : false,
				enableRowClickSelection : true,
				multiSelect : false,
				primaryKeyFn : function(entity, idx) {
					return entity.name;
				},
				columnDefs : [
					{
						field : 'name',
						displayName : 'Property',
						resizable : true
					},
					{
						field : 'value',
						displayName : 'Value',
						resizable : true,
						width : 150
					}
				]
			};

		}
	};

	return Runtime;

})(Runtime || {});

// tell the hawtio plugin loader about our plugin so it can be
// bootstrapped with the rest of angular
hawtioPluginLoader.addModule(Runtime.pluginName);