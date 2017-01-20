/**
 * @module Process
 * @mail Process
 * 
 * The main entry point for the Process module
 * 
 */
var Process = (function(Process) {

	/**
	 * @property pluginName
	 * @type {string}
	 * 
	 * The name of this plugin
	 */
	Process.pluginName = 'process_plugin';

	/**
	 * @property log
	 * @type {Logging.Logger}
	 * 
	 * This plugin's logger instance
	 */
	Process.log = Logger.get('Process');

	/**
	 * @property contextPath
	 * @type {string}
	 * 
	 * The top level path of this plugin on the server
	 * 
	 */
	Process.contextPath = "${contextPath}";

	/**
	 * @property templatePath
	 * @type {string}
	 * 
	 * The path to this plugin's partials
	 */
	Process.templatePath = Process.contextPath + "plugin/html/";

	/**
	 * @property module
	 * @type {object}
	 * 
	 * This plugin's angularjs module instance. This plugin only needs
	 * hawtioCore to run, which provides services like workspace, viewRegistry
	 * and layoutFull used by the run function
	 */
	Process.module = angular.module('process_plugin', [ 'hawtioCore' ]).config(
		function($routeProvider) {

			/**
			 * Here we define the route for our plugin. One note is to avoid
			 * using 'otherwise', as hawtio has a handler in place when a
			 * route doesn't match any routes that routeProvider has been
			 * configured with.
			 */
			$routeProvider.when('/process_plugin', {
				templateUrl : Process.templatePath + 'process.html'
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
	Process.module.run(function(workspace, viewRegistry, layoutFull) {

		Process.log.info(Process.pluginName, " loaded");

		Core.addCSS(Process.contextPath + "plugin/css/process.css");

		// tell the app to use the full layout, also could use layoutTree
		// to get the JMX tree or provide a URL to a custom layout
		viewRegistry["process_plugin"] = layoutFull;

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
			id : "process",
			content : "Process",
			title : "Java Process Information",
			isValid : function(workspace) {
				return true;
			},
			href : function() {
				return "#/process_plugin";
			},
			isActive : function(workspace) {
				return workspace.isLinkActive("process_plugin");
			}
		});

	});

	/**
	 * @function SimpleController
	 * @param $scope
	 * @param jolokia
	 * 
	 * The controller for process.html, only requires the jolokia service from
	 * hawtioCore
	 * 
	 */
	Process.ProcessController = function($scope, jolokia) {
		$scope.hello = "Hello world!";

		$scope.gridOptions=setupGridOptions();

		// register a watch with jolokia on this mbean to
		// get updated metrics
		Core.register(jolokia, $scope, {
			type : 'read',
			mbean : 'java.lang:type=Runtime',
			arguments : []
		}, onSuccess(render));

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
/*					var newPropertyName = property.replace(/\./g, '_');
					$scope.systemPropertiesTable.properties[newPropertyName] = {
						label : property,
						enabled : false
					};
					$scope.systemProperties[newPropertyName] = systemProperties[property]; */
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
				enableRowClickSelection : false,
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

	return Process;

})(Process || {});

// tell the hawtio plugin loader about our plugin so it can be
// bootstrapped with the rest of angular
hawtioPluginLoader.addModule(Process.pluginName);