package org.decentipede.hawtio.plugins;

import java.io.IOException;
import java.nio.file.Paths;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public class ContextAwareScriptServlet extends HttpServlet {

	/**
	 * 
	 */
	private static final long serialVersionUID = -6283552394152494472L;

	@Override
	protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {

		String resourcePath = this.getServletContext().getRealPath(req.getServletPath());
		try {
			resp.setContentType("application/javascript");
			String substituted = new String(java.nio.file.Files.readAllBytes(Paths.get(resourcePath)))
					.replace("${contextPath}", req.getContextPath() + "/");
			resp.setContentLength(substituted.getBytes().length);
			resp.getWriter().write(substituted);
			resp.flushBuffer();
		} catch (IOException e) {
			try {
				resp.getWriter().print("uanable to serve script " + req.getServletPath());
			} catch (IOException ignore) {
			}
		}

	}

}
