package charbot.dev

import android.app.Activity
import android.net.Uri
import android.provider.OpenableColumns
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

@InvokeArg
class GetDisplayNameArgs {
  lateinit var uri: String
}

@TauriPlugin
class DisplayNamePlugin(private val activity: Activity) : Plugin(activity) {
  @Command
  fun getDisplayName(invoke: Invoke) {
    try {
      val args = invoke.parseArgs(GetDisplayNameArgs::class.java)
      val resolver = activity.contentResolver
      val cursor =
        resolver.query(Uri.parse(args.uri), arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
      var name: String? = null
      cursor?.use {
        if (it.moveToFirst()) {
          val columnIdx = it.getColumnIndex(OpenableColumns.DISPLAY_NAME)
          if (columnIdx >= 0) {
            name = it.getString(columnIdx)
          }
        }
      }
      val result = JSObject()
      result.put("name", name)
      invoke.resolve(result)
    } catch (e: Exception) {
      val message = e.message ?: "Failed to get display name"
      invoke.reject(message)
    }
  }
}
