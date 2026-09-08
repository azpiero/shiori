use tauri::{menu::{Menu, MenuItem, Submenu}, AppHandle, Runtime};

pub fn action(id: &str) -> Option<&'static str> {
    match id {
        "reader-find" => Some("find"),
        "reader-next" => Some("next"),
        "reader-previous" => Some("previous"),
        "reader-clear" => Some("clear"),
        _ => None,
    }
}

pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    // Extend the default menu so native edit actions (including terminal paste)
    // and the platform's application/window menus retain their normal behavior.
    let menu = Menu::default(app)?;
    let find = Submenu::with_items(app, "Find", true, &[
        &MenuItem::with_id(app, "reader-find", "Find in Note…", true, Some("CmdOrCtrl+F"))?,
        &MenuItem::with_id(app, "reader-next", "Find Next", true, Some("CmdOrCtrl+G"))?,
        &MenuItem::with_id(app, "reader-previous", "Find Previous", true, Some("CmdOrCtrl+Shift+G"))?,
        &MenuItem::with_id(app, "reader-clear", "Clear Note Search", true, None::<&str>)?,
    ])?;
    for item in menu.items()? {
        if let Some(submenu) = item.as_submenu() {
            if submenu.text()? == "Edit" {
                submenu.append(&tauri::menu::PredefinedMenuItem::separator(app)?)?;
                submenu.append(&find)?;
                return Ok(menu);
            }
        }
    }
    menu.append(&find)?;
    Ok(menu)
}

#[cfg(test)]
mod tests {
    #[test]
    fn only_reader_menu_ids_dispatch_actions() {
        for (id, expected) in [("reader-find", "find"), ("reader-next", "next"), ("reader-previous", "previous"), ("reader-clear", "clear")] {
            assert_eq!(super::action(id), Some(expected));
        }
        assert_eq!(super::action("copy"), None);
        assert_eq!(super::action("paste"), None);
    }
}
