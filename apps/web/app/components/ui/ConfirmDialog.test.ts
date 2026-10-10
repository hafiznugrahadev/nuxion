import { computed, defineComponent, effectScope, h, nextTick, ref, watch } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useConfirm } from '~/composables/useConfirm';
import ConfirmDialog from './ConfirmDialog.vue';
import AlertDialog from './AlertDialog.vue';
import Modal from './Modal.vue';

let wrapper: VueWrapper;
let states: Map<string, ReturnType<typeof ref>>;
const tick = async () => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 30));
};
const button = (text: string) =>
  [...document.querySelectorAll('button')].find((b) => b.textContent === text)!;

beforeEach(() => {
  states = new Map();
  vi.stubGlobal('useState', (key: string, init: () => unknown) => {
    if (!states.has(key)) states.set(key, ref(init()));
    return states.get(key);
  });
  vi.stubGlobal('useI18n', () => ({
    t: (key: string) => (key === 'common.cancel' ? 'Cancel' : 'Confirm'),
  }));
  vi.stubGlobal('useConfirm', useConfirm);
  vi.stubGlobal('ref', ref);
  vi.stubGlobal('watch', watch);
  vi.stubGlobal('computed', computed);
  vi.stubGlobal('nextTick', nextTick);
});
afterEach(async () => {
  wrapper?.unmount();
  await tick();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});
function host() {
  wrapper = mount(ConfirmDialog, {
    attachTo: document.body,
    global: { components: { AlertDialog } },
  });
  return useConfirm();
}

describe('dangerous action confirmation', () => {
  it('cancels only the disposed caller’s request', async () => {
    host();
    const owner = effectScope();
    const other = effectScope();
    let confirmOwner!: ReturnType<typeof useConfirm>['confirm'];
    owner.run(() => {
      confirmOwner = useConfirm().confirm;
    });
    other.run(() => useConfirm());
    const result = confirmOwner({ title: 'Delete user', description: 'Cannot be undone' });
    other.stop();
    expect(useConfirm().pending.value).not.toBeNull();
    owner.stop();
    expect(await result).toBe(false);
    expect(useConfirm().pending.value).toBeNull();
  });

  it('keeps an overlapping request from replacing the first promise', async () => {
    const { confirm, settle } = host();
    const first = confirm({ title: 'Delete user', description: 'Cannot be undone' });
    expect(await confirm({ title: 'Remove passkey' })).toBe(false);
    settle(true);
    expect(await first).toBe(true);
  });

  it('focuses Cancel, labels the alert, and cancels without authorizing a mutation', async () => {
    const { confirm } = host();
    const mutate = vi.fn();
    const result = confirm({ title: 'Delete user', description: 'Cannot be undone' }).then((ok) => {
      if (ok) mutate();
      return ok;
    });
    await tick();
    const alert = document.querySelector('[role="alertdialog"]')!;
    expect(document.getElementById(alert.getAttribute('aria-labelledby')!)?.textContent).toBe(
      'Delete user',
    );
    expect(document.getElementById(alert.getAttribute('aria-describedby')!)?.textContent).toBe(
      'Cannot be undone',
    );
    expect(document.activeElement).toBe(button('Cancel'));
    button('Cancel').click();
    expect(await result).toBe(false);
    expect(mutate).not.toHaveBeenCalled();
  });

  it('only authorizes on explicit confirmation and does not dismiss a subsequent request', async () => {
    const { confirm } = host();
    const first = confirm({ title: 'Delete user', description: 'Cannot be undone' });
    await tick();
    button('Confirm').click();
    const second = first.then((ok) => {
      expect(ok).toBe(true);
      return confirm({ title: 'Remove passkey', description: 'Cannot sign in with it' });
    });
    await tick();
    expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain('Remove passkey');
    button('Cancel').click();
    expect(await second).toBe(false);
  });

  it('rejects Escape and restores focus to the originating button', async () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const { confirm } = host();
    const result = confirm({ title: 'Delete user', description: 'Cannot be undone' });
    await tick();
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(await result).toBe(false);
    await tick();
    expect(document.activeElement).toBe(trigger);
  });

  it('keeps the password modal open and restores focus after cancelling its alert', async () => {
    const { confirm } = useConfirm();
    const busy = ref(false);
    const parent = defineComponent({
      setup: () => () =>
        h('div', [
          h(
            Modal,
            { open: true, title: 'Recovery codes', description: 'Confirm your password' },
            {
              default: () =>
                h(
                  'button',
                  {
                    disabled: busy.value,
                    onClick: async () => {
                      busy.value = true;
                      await confirm({
                        title: 'Replace recovery codes',
                        description: 'Old codes stop working',
                      });
                      busy.value = false;
                    },
                  },
                  'Regenerate',
                ),
            },
          ),
          h(ConfirmDialog),
        ]),
    });
    wrapper = mount(parent, {
      attachTo: document.body,
      global: { components: { AlertDialog }, stubs: { AppIcon: true } },
    });
    await tick();
    const trigger = button('Regenerate');
    trigger.focus();
    trigger.click();
    await tick();
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(trigger.disabled).toBe(true);
    button('Cancel').click();
    await tick();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
