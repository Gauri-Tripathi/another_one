import AppKit
import ApplicationServices
import Foundation

// Read-only AX access. No screenshots, event taps, keystrokes, Apple Events,
// browser JavaScript, or application launching. One JSON reply per stdin line.
func attribute(_ element: AXUIElement, _ name: String) -> CFTypeRef? {
    var value: CFTypeRef?
    return AXUIElementCopyAttributeValue(element, name as CFString, &value) == .success ? value : nil
}
func text(_ element: AXUIElement, _ name: String) -> String {
    return attribute(element, name) as? String ?? ""
}
func focusedWindow(_ application: AXUIElement) -> AXUIElement? {
    guard let value = attribute(application, kAXFocusedWindowAttribute),
          CFGetTypeID(value) == AXUIElementGetTypeID() else { return nil }
    return (value as! AXUIElement)
}
func geometryKey(_ window: AXUIElement, _ pid: pid_t) -> String {
    var point = CGPoint.zero
    var size = CGSize.zero
    if let value = attribute(window, kAXPositionAttribute), CFGetTypeID(value) == AXValueGetTypeID() {
        _ = AXValueGetValue(value as! AXValue, .cgPoint, &point)
    }
    if let value = attribute(window, kAXSizeAttribute), CFGetTypeID(value) == AXValueGetTypeID() {
        _ = AXValueGetValue(value as! AXValue, .cgSize, &size)
    }
    // Cross-process comparable identity for the separate fast and URL readers.
    return "\(pid):\(point.x):\(point.y):\(size.width):\(size.height)"
}
func webURL(_ value: String) -> String? {
    guard let url = URL(string: value), let scheme = url.scheme?.lowercased(),
          ["http", "https"].contains(scheme), url.host != nil else { return nil }
    return value
}
func browserAddress(_ window: AXUIElement) -> String? {
    if let document = webURL(text(window, kAXDocumentAttribute)) { return document }
    let deadline = ProcessInfo.processInfo.systemUptime + 0.45
    var queue: [(AXUIElement, Int)] = [(window, 0)]
    var index = 0
    while index < queue.count && index < 120 && ProcessInfo.processInfo.systemUptime < deadline {
        let (element, depth) = queue[index]; index += 1
        let role = text(element, kAXRoleAttribute)
        // Never descend into a page's DOM or read its arbitrary input values.
        if role == "AXWebArea" { continue }
        if role == "AXTextField" || role == "AXComboBox" {
            let identifier = text(element, "AXIdentifier").lowercased()
            let description = text(element, kAXDescriptionAttribute).lowercased()
            let addressField = identifier.contains("omnibox") || identifier.contains("urlbar") ||
                identifier.contains("address") || description.contains("address") ||
                description.contains("search or enter website")
            if addressField {
                let value = text(element, kAXValueAttribute)
                if let url = webURL(value) { return url }
                // Address bars sometimes omit the scheme. Reject search queries.
                if !value.contains(where: { $0.isWhitespace }), value.contains("."),
                   !value.contains(":"), let url = webURL("https://" + value) { return url }
            }
        }
        if depth < 7, let children = attribute(element, kAXChildrenAttribute) as? [AXUIElement] {
            queue.append(contentsOf: children.prefix(120 - min(queue.count, 120)).map { ($0, depth + 1) })
        }
    }
    return nil
}
let browsers: Set<String> = ["com.apple.Safari", "com.apple.SafariTechnologyPreview", "com.google.Chrome",
    "com.microsoft.edgemac", "com.brave.Browser", "org.mozilla.firefox", "com.operasoftware.Opera",
    "com.vivaldi.Vivaldi", "company.thebrowser.Browser"]
let includeAddress = CommandLine.arguments.contains("--address")
func capture() -> [String: Any] {
    guard let app = NSWorkspace.shared.frontmostApplication else { return ["error": "No foreground application"] }
    let pid = app.processIdentifier
    let observedTick = ProcessInfo.processInfo.systemUptime * 1000
    let observedAt = Date().timeIntervalSince1970 * 1000
    let trusted = AXIsProcessTrusted()
    let application = AXUIElementCreateApplication(pid)
    AXUIElementSetMessagingTimeout(application, 0.15)
    let window = trusted ? focusedWindow(application) : nil
    let title = window.map { text($0, kAXTitleAttribute) } ?? ""
    let windowId = window.map { geometryKey($0, pid) } ?? "\(pid):unavailable"
    var result: [String: Any] = ["appName": app.localizedName ?? "Unknown", "bundleId": app.bundleIdentifier ?? "",
        "processId": Int(pid), "windowId": windowId, "windowTitle": title,
        "observedTick": observedTick, "observedAt": observedAt, "accessibility": trusted]
    if let path = app.bundleURL?.path { result["executablePath"] = path }
    if includeAddress, browsers.contains(app.bundleIdentifier ?? ""), let window = window,
       let address = browserAddress(window) { result["address"] = address }
    guard NSWorkspace.shared.frontmostApplication?.processIdentifier == pid else { return ["unstable": true] }
    if trusted {
        let after = focusedWindow(application)
        if title != (after.map { text($0, kAXTitleAttribute) } ?? "") ||
            windowId != (after.map { geometryKey($0, pid) } ?? "\(pid):unavailable") { return ["unstable": true] }
    }
    return result
}
while readLine() != nil {
    autoreleasepool {
        let result = capture()
        if let data = try? JSONSerialization.data(withJSONObject: result), let line = String(data: data, encoding: .utf8) {
            print(line)
        } else { print("null") }
        fflush(stdout)
    }
}
