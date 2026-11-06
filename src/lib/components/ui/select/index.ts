import { Select as SelectPrimitive } from "bits-ui";

import Root from "./select.svelte";
import Group from "./select-group.svelte";
import Value from "./select-value.svelte";
import Trigger from "./select-trigger.svelte";
import Content from "./select-content.svelte";
import Label from "./select-label.svelte";
import Item from "./select-item.svelte";
import Separator from "./select-separator.svelte";
import ScrollUpButton from "./select-scroll-up-button.svelte";
import ScrollDownButton from "./select-scroll-down-button.svelte";

export {
  Root,
  Group,
  Value,
  Trigger,
  Content,
  Label,
  Item,
  Separator,
  ScrollUpButton,
  ScrollDownButton,
  //
  Root as Select,
  Group as SelectGroup,
  Value as SelectValue,
  Trigger as SelectTrigger,
  Content as SelectContent,
  Label as SelectLabel,
  Item as SelectItem,
  Separator as SelectSeparator,
  ScrollUpButton as SelectScrollUpButton,
  ScrollDownButton as SelectScrollDownButton,
};
export type SelectProps = SelectPrimitive.RootProps;
