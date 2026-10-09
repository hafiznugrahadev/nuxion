import { defineComponent, h, nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useForm } from 'vee-validate';
import { describe, expect, it, vi } from 'vitest';
import Fieldset from '~/components/common/fields/Fieldset.vue';
import Input from '~/components/ui/Input.vue';
import TextField from '~/components/common/fields/TextField.vue';
import { ApiError, apiFieldErrors, applyApiFieldErrors } from './api-errors';
import { unwrap, unwrapPaginated } from './api-client';
import type { ApiErrorResponse } from '@nuxion/shared-types';

const response: ApiErrorResponse = {
  success: false,
  statusCode: 409,
  message: 'Email already exists',
  error: 'Conflict',
  path: '/users',
  timestamp: '2026-10-09T00:00:00.000Z',
  fieldErrors: { email: ['Email already exists'] },
};

describe('API form field errors', () => {
  it('preserves the typed error envelope for normal and paginated responses', () => {
    for (const decode of [unwrap, unwrapPaginated]) {
      try {
        decode(response);
        expect.fail('Expected an API error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).data).toBe(response);
        expect(apiFieldErrors(error)).toEqual({ email: 'Email already exists' });
      }
    }
  });

  it('ignores unknown fields and unstructured failures instead of guessing attribution', () => {
    const setErrors = vi.fn();
    expect(applyApiFieldErrors(new Error('Email already exists'), setErrors, ['email'])).toBe(
      false,
    );
    expect(
      applyApiFieldErrors({ data: { fieldErrors: { token: ['Expired'] } } }, setErrors, ['email']),
    ).toBe(false);
    expect(setErrors).not.toHaveBeenCalled();
  });

  it.each(['fetch', 'unwrap'])(
    'renders a duplicate email %s failure in its Fieldset and clears on successful retry',
    async (kind) => {
      let fail = true;
      const Form = defineComponent({
        setup() {
          const { handleSubmit, setErrors } = useForm<{ email: string }>({
            initialValues: { email: 'used@example.test' },
          });
          const onSubmit = handleSubmit(async () => {
            try {
              if (fail) {
                if (kind === 'fetch') throw { data: response, response: { status: 409 } };
                unwrap(response);
              }
            } catch (error) {
              applyApiFieldErrors(error, setErrors, ['email']);
            }
          });
          return () => h('form', { onSubmit }, [h(TextField, { name: 'email', label: 'Email' })]);
        },
      });
      const wrapper = mount(Form, { global: { components: { Fieldset, Input } } });
      await wrapper.get('form').trigger('submit');
      await flushPromises();
      expect(wrapper.get('#email-error').text()).toBe('Email already exists');
      expect(wrapper.get('input').attributes('aria-describedby')).toBe('email-error');
      expect(wrapper.get('input').attributes('aria-invalid')).toBe('true');
      fail = false;
      await wrapper.get('input').setValue('available@example.test');
      await nextTick();
      await wrapper.get('form').trigger('submit');
      await flushPromises();
      expect(wrapper.find('#email-error').exists()).toBe(false);
      expect(wrapper.get('input').attributes('aria-invalid')).toBe('false');
    },
  );
});
