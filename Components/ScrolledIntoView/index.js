import debounce from 'lodash.debounce';
import { isBrowser } from 'acq-utils/lib/utils';
import React, { useState, useRef, useEffect } from 'react';

/**
 * `scrolledIntoView` is a Higher-Order Component that determines if the component passed to it has scrolled into the viewport.
 *
 * The status of `isVisible` will only toggle once and then the event listener will be removed from the window.
 * 'Scroll Reach' actions should fire only once in CXO tests so there is no need to continue to listen for scroll events after the component has scrolled into the viewport.
 *
 * Accessing `isVisible` status:
 *  From the parent (optional): pass a `toggleVisibility` function via props and it will be invoked when the wrapped component scrolls into view
 *  From the child: `isVisible` is passed via props to the wrapped component
 * */

const isInViewport = wrapper => {
  const { bottom, top } = wrapper.current.getBoundingClientRect();
  const isHidden = bottom === 0 && top === 0;
  const isBelowViewportTop = bottom >= 0;
  const isAboveViewportBottom = top - window.innerHeight <= 0;
  return isBelowViewportTop && isAboveViewportBottom && !isHidden;
};

const toggleState = (setIsVisible, toggleVisibility) => {
  setIsVisible(true);
  toggleVisibility && toggleVisibility();
};

function scrolledIntoView(WrappedComponent) {
  return function(props) {
    const [isVisible, setIsVisible] = useState(false);
    const wrapper = useRef(null);
    const { toggleVisibility } = props;

    const debouncedFn = debounce(() => {
      if (isBrowser() && wrapper.current && isInViewport(wrapper)) {
        toggleState(setIsVisible, toggleVisibility);
        window.removeEventListener('scroll', debouncedFn);
      }
    }, 250);

    useEffect(() => {
      let cleanup;
      const element = wrapper.current;

      /* Verify that IntersectionObserver is available in the browser (i.e. not IE11) */
      if (isBrowser() && element && typeof IntersectionObserver !== 'undefined') {
        const observer = new IntersectionObserver(([element]) => {
          if (element.isIntersecting !== isVisible) {
            toggleState(setIsVisible, toggleVisibility);
            observer.disconnect();
          }
        });
        observer.observe(element);
        cleanup = observer.disconnect;
      } else {
        window.addEventListener('scroll', debouncedFn);
        cleanup = () => window.removeEventListener('scroll', debouncedFn);
      }
      return cleanup;
    }, []);

    return (
      <div ref={wrapper}>
        <WrappedComponent {...props} isVisible={isVisible} />
      </div>
    );
  };
}

export default scrolledIntoView;
