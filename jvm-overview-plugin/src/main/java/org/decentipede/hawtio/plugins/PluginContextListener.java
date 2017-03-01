package org.decentipede.hawtio.plugins;

import javax.servlet.ServletContext;
import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import io.hawt.jvm.local.JVMList;
import io.hawt.web.plugin.HawtioPlugin;

public class PluginContextListener implements ServletContextListener {

  private static final Logger LOG = LoggerFactory.getLogger(PluginContextListener.class);

  HawtioPlugin runtimePlugin = null;
  HawtioPlugin jcmdPlugin = null;

  @Override
  public void contextInitialized(ServletContextEvent servletContextEvent) {

    ServletContext context = servletContextEvent.getServletContext();

    runtimePlugin = new HawtioPlugin();
    runtimePlugin.setContext(context.getContextPath());
    runtimePlugin.setName("java-runtime-plugin");
    runtimePlugin.setScripts("plugin/js/runtimePlugin.js");
    runtimePlugin.setDomain("java-runtime-plugin");
    runtimePlugin.init();
    
    LOG.info("Initialized {} plugin", runtimePlugin.getName());
    
    jcmdPlugin = new HawtioPlugin();
    jcmdPlugin.setContext(context.getContextPath());
    jcmdPlugin.setName("jcmd-plugin");
    jcmdPlugin.setScripts("plugin/js/jcmdPlugin.js");
    jcmdPlugin.setDomain("jcmd-plugin");
    jcmdPlugin.init();
    
    //HACK HACK: nothing to see here
    new JVMList().init();
  }

  @Override
  public void contextDestroyed(ServletContextEvent servletContextEvent) {
    runtimePlugin.destroy();
    LOG.info("Destroyed {} plugin", runtimePlugin.getName());
    jcmdPlugin.destroy();
    LOG.info("Destroyed {} plugin", jcmdPlugin.getName());
  }
}
