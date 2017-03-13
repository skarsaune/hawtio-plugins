//Util functions
function splitResponse(response) {
	return response.match(/Dumped recording (\d+),(.+) written to:\n\n(.+)/);
}

/**
 * @module DiagnosticCommand
 * 
 * The main entry point for the DiagnosticCommand module
 * 
 */
var DiagnosticCommand = (function(DiagnosticCommand) {

	/**
	 * @property pluginName
	 * @type {string}
	 * 
	 * The name of this plugin
	 */
	DiagnosticCommand.pluginName = 'diagnosticCommand_plugin';

	/**
	 * @property log
	 * @type {Logging.Logger}
	 * 
	 * This plugin's logger instance
	 */
	DiagnosticCommand.log = Logger.get('DiagnosticCommand');

	/**
	 * @property contextPath
	 * @type {string}
	 * 
	 * The top level path of this plugin on the server
	 * 
	 */
	DiagnosticCommand.contextPath = "${contextPath}";

	/**
	 * @property templatePath
	 * @type {string}
	 * 
	 * The path to this plugin's partials
	 */
	DiagnosticCommand.templatePath = DiagnosticCommand.contextPath + "plugin/html/";
	
	var mbean = "com.sun.management:type=DiagnosticCommand";

	/**
	 * @property module
	 * @type {object}
	 * 
	 * This plugin's angularjs module instance. This plugin only needs
	 * hawtioCore to run, which provides services like workspace, viewRegistry
	 * and layoutFull used by the run function
	 */
	DiagnosticCommand.module = angular.module('diagnosticCommand_plugin', [ 'hawtioCore' ]).config(
		function($routeProvider) {

			/**
			 * Here we define the route for our plugin. One note is to avoid
			 * using 'otherwise', as hawtio has a handler in place when a
			 * route doesn't match any routes that routeProvider has been
			 * configured with.
			 */
			$routeProvider.when('/diagnosticCommand_plugin', {
				templateUrl : DiagnosticCommand.templatePath + 'diagnosticCommand.html'
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
	DiagnosticCommand.module.run(function(workspace, viewRegistry, layoutFull) {

		DiagnosticCommand.log.info(DiagnosticCommand.pluginName, " loaded");

		Core.addCSS(DiagnosticCommand.contextPath + "plugin/css/diagnosticCommand.css");

		// tell the app to use the full layout, also could use layoutTree
		// to get the JMX tree or provide a URL to a custom layout
		viewRegistry["diagnosticCommand_plugin"] = layoutFull;

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
			id : "diagnosticCommand",
			content : "JCMD",
			title : "Java Diagnostic Command (jcmd)",
			isValid : function(workspace) {
				return workspace.treeContainsDomainAndProperties("com.sun.management");
			},
			href : function() {
				return "#/diagnosticCommand_plugin";
			},
			isActive : function(workspace) {
				return workspace.isLinkActive("diagnosticCommand_plugin");
			}
		});

	});

	/**
	 * @function DiagnosticCommandController
	 * @param $scope
	 * @param jolokia
	 * 
	 * The controller for diagnosticCommand.html, only requires the jolokia service from
	 * hawtioCore
	 * 
	 */
	DiagnosticCommand.DiagnosticCommandController = function($scope, jolokia, workspace) {
		var supportsClassStats = false;
		$scope.jfrStatus = '';
		$scope.jfrEnabled=false;
		$scope.isRecording=false;
		$scope.response = {};
		$scope.recordings=[];		

		// register a watch with jolokia on this mbean to
		// get updated metrics
		Core.register(jolokia, $scope, [{
			type : 'exec',
			operation: 'jfrCheck([Ljava.lang.String;)',
			mbean : 'com.sun.management:type=DiagnosticCommand',
			arguments : ['']
		},
		{
			type : 'read',
			mbean : 'java.lang:type=Runtime',
			arguments : []
		}], onSuccess(render));
		
		function getClassMethod() {
			if(supportsClassStats) {
				return 'gcClassStats([Ljava.lang.String;)';
			} else {
				return 'gcClassHistogram([Ljava.lang.String;)';
			}
		}
		
		$scope.loadClassStats = function() {
			var opName=getClassMethod();
			DiagnosticCommand.log.info(Date.now() + " invoking operation " + opName
					+ " on decentipede");
			jolokia.request([ {
				type : "exec",
				operation : opName,
				mbean : 'com.sun.management:type=DiagnosticCommand',
				arguments : ['']
			} ], onSuccess(function(response) {
				$scope.classHistogram = response.value;
				Core.$apply($scope);
				DiagnosticCommand.log.info(Date.now() + " Operation " + opName
						+ " was successful" + response.value);
			}));
		};
				

		// update display of metric
		function render(response) {

			if(response.request.type === 'exec' && response.request.operation.indexOf("jfrCheck") > -1) {
				var statusString=response.value;
				$scope.jfrEnabled=statusString.indexOf("not enabled") == -1;
				$scope.isRecording=statusString.indexOf("(running)") > -1;
				if((statusString.indexOf("Use JFR.") > -1 || statusString.indexOf("Use VM.") > -1) && $scope.pid) {
					statusString=statusString.replace("Use ", "Use command line: jcmd " + $scope.pid  + " ");
				}
				$scope.jfrStatus=statusString;
				if($scope.isRecording) {
					var regex = /recording=(\d)/g;
					$scope.recording=regex.exec(statusString)[1];
				}
				
			} else {
				var regex = /(\d+)@(.+)/g;
				var pidAndHost = regex.exec(response.value.Name);
				$scope.pid = pidAndHost[1];
				supportsClassStats = response.value.InputArguments.indexOf('-XX:+UnlockDiagnosticVMOptions') > -1;
			}
			$scope.response=response[0];
						
			Core.$apply($scope);
		}
		
		function executeDiagnosticFunction(operation, arguments, callback) {
			DiagnosticCommand.log.info(Date.now() + " Invoking operation " + operation
					+ " with arguments" + arguments);
			jolokia.request([{
				type : "exec",
				operation : operation,
				mbean : 'com.sun.management:type=DiagnosticCommand',
				arguments : arguments
			} ], onSuccess(function(response) {
				DiagnosticCommand.log.debug(Date.now() + " Operation " + operation
						+ " was successful" + response.value);
				if(callback) {
					callback(response.value);
				}
				Core.$apply($scope);
			}));
		}
		
		$scope.unlock=function() {
			executeDiagnosticFunction('vmUnlockCommercialFeatures()', []);
		};
		
		$scope.startRecording=function() {
			executeDiagnosticFunction('jfrStart([Ljava.lang.String;)', ['']);
		};
		
		$scope.dumpRecording=function() {
			var filename=window.prompt("Enter filename", "recording" + $scope.recording + ".jfr");
			if(filename) {
				executeDiagnosticFunction('jfrDump([Ljava.lang.String;)', 
						["recording=" + $scope.recording + ",filename=" + filename],
						function(response) {
					
					
					matches = splitResponse(response);
					DiagnosticCommand.log.debug("response: " + response + " split: " + matches + "split2: " + splitResponse(response));
					if(matches) {
						var recordingData = {number: matches[1], size: matches[2], file: matches[3], time: Date.now()};
						DiagnosticCommand.log.debug("data: " + recordingData);
						$scope.recordings.push(recordingData);
					}
					
				});
				
			}	
		}
		
		$scope.stopRecording=function() {
				executeDiagnosticFunction('jfrStop([Ljava.lang.String;)', ["recording=" + $scope.recording]);
		}
		
		

	};

	return DiagnosticCommand;

})(DiagnosticCommand || {});

// tell the hawtio plugin loader about our plugin so it can be
// bootstrapped with the rest of angular
hawtioPluginLoader.addModule(DiagnosticCommand.pluginName);