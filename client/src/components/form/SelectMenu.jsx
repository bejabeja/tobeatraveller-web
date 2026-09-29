import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { normalizeSearchText } from "@tobeatraveller/shared";
import { IoCheckmark, IoChevronDown } from "react-icons/io5";
import "./SelectMenu.scss";

const MENU_MAX_HEIGHT = 280;
const MENU_MIN_WIDTH = 200;
const MENU_GAP = 6;
const VIEWPORT_MARGIN = 8;
// Below this much room under the button the menu opens upwards instead, if
// there is more room there.
const MIN_ROOM_BELOW = 180;
const TYPE_AHEAD_RESET_MS = 700;

// What a label is looked up by when typing: without the emoji or symbol some
// labels start with ("⛽ Fuel"), and ignoring case and accents.
const typeAheadText = (label) => normalizeSearchText(String(label).replace(/^[^\p{L}\p{N}]+/u, ""));

const computeMenuPosition = (button) => {
  const rect = button.getBoundingClientRect();
  const roomBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
  const roomAbove = rect.top - VIEWPORT_MARGIN;
  const opensUpwards = roomBelow < MIN_ROOM_BELOW && roomAbove > roomBelow;
  const width = Math.max(rect.width, MENU_MIN_WIDTH);
  const left = Math.max(VIEWPORT_MARGIN, Math.min(rect.left, window.innerWidth - width - VIEWPORT_MARGIN));
  return {
    left,
    minWidth: width,
    maxWidth: window.innerWidth - 2 * VIEWPORT_MARGIN,
    maxHeight: Math.min(MENU_MAX_HEIGHT, (opensUpwards ? roomAbove : roomBelow) - MENU_GAP),
    ...(opensUpwards
      ? { bottom: window.innerHeight - rect.top + MENU_GAP }
      : { top: rect.bottom + MENU_GAP }),
  };
};

// Replaces the browser's own <select>: its list is drawn by the operating
// system, out of reach of the app's look, and on a phone it takes the whole
// screen. The list is drawn on the page body, not inside the field, so a modal
// or a panel that clips what overflows it cannot cut the list off.
const SelectMenu = ({
  options, value, onChange, placeholder = "", ariaLabel, ariaDescribedBy, id, Icon, variant = "field", className = "", invalid = false, disabled = false, onBlur, fieldRef,
}) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();
  // One stable callback, so a form library that takes the ref is not handed a
  // new one on every render.
  const setButtonRef = useCallback((node) => {
    buttonRef.current = node;
    if (typeof fieldRef === "function") fieldRef(node);
  }, [fieldRef]);
  // Scrolling the active option into view is for the keyboard: on hover the
  // option is already under the pointer, and moving the list under it makes it jitter.
  const scrollToActiveRef = useRef(false);
  const typeAheadRef = useRef({ text: "", timer: null });

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = options[selectedIndex];
  const optionId = (index) => `${listId}-option-${index}`;

  const openMenu = () => {
    setPosition(computeMenuPosition(buttonRef.current));
    scrollToActiveRef.current = true;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const moveActive = (index) => {
    scrollToActiveRef.current = true;
    setActiveIndex(index);
  };

  // Typing jumps to the next option that starts with what was typed, as in a
  // native select. The same letter again goes on to the next match.
  const typeAhead = (character) => {
    const state = typeAheadRef.current;
    clearTimeout(state.timer);
    state.text += character;
    state.timer = setTimeout(() => { state.text = ""; }, TYPE_AHEAD_RESET_MS);
    const query = normalizeSearchText(state.text);
    const current = open ? activeIndex : selectedIndex;
    const from = state.text.length === 1 ? current + 1 : Math.max(current, 0);
    for (let step = 0; step < options.length; step++) {
      const index = (from + step) % options.length;
      if (typeAheadText(options[index].label).startsWith(query)) {
        if (!open) openMenu();
        moveActive(index);
        return;
      }
    }
  };

  const closeMenu = () => setOpen(false);

  const choose = (index) => {
    const option = options[index];
    closeMenu();
    if (option && option.value !== value) onChange(option.value);
    buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (buttonRef.current?.contains(event.target) || listRef.current?.contains(event.target)) return;
      closeMenu();
    };
    // The keyboard opening or the browser's bars moving fire these on a phone,
    // so the list follows its field instead of closing; it closes only once the
    // field has scrolled out of sight.
    const follow = (event) => {
      if (event.type === "scroll" && listRef.current?.contains(event.target)) return;
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) closeMenu();
      else setPosition(computeMenuPosition(buttonRef.current));
    };
    document.addEventListener("mousedown", closeOutside);
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [open]);

  useEffect(() => () => clearTimeout(typeAheadRef.current.timer), []);

  useEffect(() => {
    if (!open || !scrollToActiveRef.current) return;
    scrollToActiveRef.current = false;
    listRef.current?.children[activeIndex]?.scrollIntoView?.({ block: "nearest" });
  }, [open, activeIndex]);

  const isTypedCharacter = (event) => event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;

  const handleKeyDown = (event) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter"].includes(event.key) || (event.key === " " && !typeAheadRef.current.text)) {
        event.preventDefault();
        openMenu();
      } else if (isTypedCharacter(event)) {
        event.preventDefault();
        typeAhead(event.key);
      }
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveActive(Math.min(activeIndex + 1, options.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        moveActive(Math.max(activeIndex - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        moveActive(0);
        break;
      case "End":
        event.preventDefault();
        moveActive(options.length - 1);
        break;
      case "Enter":
        event.preventDefault();
        choose(activeIndex);
        break;
      case "Escape":
        // Only the menu closes: a dialog around the field must stay open.
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
        break;
      case "Tab":
        closeMenu();
        break;
      default:
        if (event.key === " " && !typeAheadRef.current.text) {
          event.preventDefault();
          choose(activeIndex);
        } else if (isTypedCharacter(event)) {
          event.preventDefault();
          typeAhead(event.key);
        }
    }
  };

  // Firefox clicks a button when Space is released, even if keydown was handled.
  const handleKeyUp = (event) => {
    if (event.key === " ") event.preventDefault();
  };

  const hasValue = Boolean(selected) && selected.value !== "";
  // An empty choice ("No trip") reads as the placeholder ("Trip") when there is one.
  const showsPlaceholder = !hasValue && Boolean(placeholder);

  return (
    <>
      <button
        ref={setButtonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        className={[
          "select-menu__button",
          `select-menu__button--${variant}`,
          hasValue && "select-menu__button--filled",
          invalid && "select-menu__button--invalid",
          open && "select-menu__button--open",
          className,
        ].filter(Boolean).join(" ")}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={onBlur}
      >
        {Icon && <Icon className="select-menu__icon" aria-hidden="true" />}
        <span className={`select-menu__label${selected && !showsPlaceholder ? "" : " select-menu__label--placeholder"}`}>
          {showsPlaceholder || !selected ? placeholder : selected.label}
        </span>
        <IoChevronDown className="select-menu__chevron" aria-hidden="true" />
      </button>

      {open && createPortal(
        <ul ref={listRef} id={listId} role="listbox" aria-label={ariaLabel} className="select-menu__list" style={position} data-select-menu-list>
          {options.map((option, index) => (
            <li
              key={option.value}
              id={optionId(index)}
              role="option"
              data-value={option.value}
              aria-selected={option.value === value}
              className={`select-menu__option${index === activeIndex ? " select-menu__option--active" : ""}${option.value === value ? " select-menu__option--selected" : ""}`}
              // Keeps the focus on the field, so the keyboard carries on where it was.
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(index)}
            >
              <span className="select-menu__option-label">{option.label}</span>
              {option.value === value && <IoCheckmark className="select-menu__check" aria-hidden="true" />}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </>
  );
};

export default SelectMenu;
