package org.decentipede.hawtio.plugins;

import javax.servlet.ServletContext;
import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import io.hawt.web.plugin.HawtioPlugin;

public class PluginContextListener implements ServletContextListener {

  private static final Logger LOG = LoggerFactory.getLogger(PluginContextListener.class);

  HawtioPlugin plugin = null;

  @Override
  public void contextInitialized(ServletContextEvent servletContextEvent) {

    ServletContext context = servletContextEvent.getServletContext();

    plugin = new HawtioPlugin();
    plugin.setContext(context.getContextPath());
    plugin.setName("java-overview-plugin");
    plugin.setScripts("plugin/js/runtimePlugin.js");
    plugin.setDomain("java-overview-plugin");
    plugin.init();
    

    LOG.info("Initialized {} plugin", plugin.getName());
    
  }

  @Override
  public void contextDestroyed(ServletContextEvent servletContextEvent) {
    plugin.destroy();
    LOG.info("Destroyed {} plugin", plugin.getName());
  }
}
