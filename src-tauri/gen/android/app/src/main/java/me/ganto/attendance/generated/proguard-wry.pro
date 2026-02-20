# THIS FILE IS AUTO-GENERATED. DO NOT MODIFY!!

# Copyright 2020-2023 Tauri Programme within The Commons Conservancy
# SPDX-License-Identifier: Apache-2.0
# SPDX-License-Identifier: MIT

-keep class me.ganto.attendance.* {
  native <methods>;
}

-keep class me.ganto.attendance.WryActivity {
  public <init>(...);

  void setWebView(me.ganto.attendance.RustWebView);
  java.lang.Class getAppClass(...);
  java.lang.String getVersion();
}

-keep class me.ganto.attendance.Ipc {
  public <init>(...);

  @android.webkit.JavascriptInterface public <methods>;
}

-keep class me.ganto.attendance.RustWebView {
  public <init>(...);

  void loadUrlMainThread(...);
  void loadHTMLMainThread(...);
  void evalScript(...);
}

-keep class me.ganto.attendance.RustWebChromeClient,me.ganto.attendance.RustWebViewClient {
  public <init>(...);
}
