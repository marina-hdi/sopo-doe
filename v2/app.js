console.log("DOE v2 loaded 🚀");

const steps = document.querySelectorAll('.step');
let currentStep = 0;

steps.forEach((step, index) => {
    step.addEventListener('click', () => {
        steps[currentStep].classList.remove('active');
        currentStep = index;
        steps[currentStep].classList.add('active');
    });
});
