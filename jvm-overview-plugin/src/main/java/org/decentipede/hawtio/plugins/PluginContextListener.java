package org.decentipede.hawtio.plugins;

import io.hawt.jvm.local.JVMList;
import io.hawt.web.plugin.HawtioPlugin;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.ServletContext;
import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;

public class PluginContextListener implements ServletContextListener {

  private static final Logger LOG = LoggerFactory.getLogger(PluginContextListener.class);

  HawtioPlugin plugin = null;

  @Override
  public void contextInitialized(ServletContextEvent servletContextEvent) {

    ServletContext context = servletContextEvent.getServletContext();

    plugin = new HawtioPlugin();
    plugin.setContext(context.getContextPath());
    plugin.setName("java-overview-plugin");
    plugin.setScripts("plugin/js/processPlugin.js");
    plugin.setDomain("java-overview-plugin");
    plugin.init();
    

    LOG.info("Initialized {} plugin", plugin.getName());
    
    new JVMList().init();

  }

  @Override
  public void contextDestroyed(ServletContextEvent servletContextEvent) {
    plugin.destroy();
    LOG.info("Destroyed {} plugin", plugin.getName());
  }
}
