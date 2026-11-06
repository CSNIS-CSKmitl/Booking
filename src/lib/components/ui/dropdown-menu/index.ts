import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";

import Root from "./dropdown-menu.svelte";
import Trigger from "./dropdown-menu-trigger.svelte";
import Portal from "./dropdown-menu-portal.svelte";
import Content from "./dropdown-menu-content.svelte";
import Group from "./dropdown-menu-group.svelte";
import Label from "./dropdown-menu-label.svelte";
import Item from "./dropdown-menu-item.svelte";
import Separator from "./dropdown-menu-separator.svelte";
import Shortcut from "./dropdown-menu-shortcut.svelte";

export {
  Root,
  Trigger,
  Portal,
  Content,
  Group,
  Label,
  Item,
  Separator,
  Shortcut,
  //
  Root as DropdownMenu,
  Trigger as DropdownMenuTrigger,
  Portal as DropdownMenuPortal,
  Content as DropdownMenuContent,
  Group as DropdownMenuGroup,
  Label as DropdownMenuLabel,
  Item as DropdownMenuItem,
  Separator as DropdownMenuSeparator,
  Shortcut as DropdownMenuShortcut,
};
export type DropdownMenuProps = DropdownMenuPrimitive.RootProps;
