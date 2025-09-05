---
title: HELP pepr_label_counter example counter for counting number of times hello-pepr label has been applied
description: HELP pepr_label_counter example counter for counting number of times hello-pepr label has been applied
---

# TYPE pepr_label_counter counter
pepr_label_counter 0

# HELP pepr_label_guage example gauge for counting how times times a given label has been applied
# TYPE pepr_label_guage gauge
terminal_b > kubectl run a --image=nginx 
terminal_b > kubectl run b --image=nginx
terminal_b > kubectl run c --image=nginx
terminal_b > curl -k http://localhost:3000/metrics
...
# TYPE pepr_label_counter counter
pepr_label_counter 3

# HELP pepr_label_guage example gauge for counting how times times a given label has been applied
# TYPE pepr_label_guage gauge
pepr_label_guage{label="blue"} 3
pepr_label_guage{label="green"} 3
pepr_label_guage{label="hello-pepr"} 3
```