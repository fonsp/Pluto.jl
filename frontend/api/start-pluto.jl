#!/usr/bin/env julia

# Start Pluto server for testing
println("Starting Pluto server for API testing...")

import Pluto

# Start server with test-friendly settings
Pluto.run(
    host="127.0.0.1",
    port=1234,
    require_secret_for_access=false,
    require_secret_for_open_links=false,
    launch_browser=false,
    auto_reload_from_file=false
)