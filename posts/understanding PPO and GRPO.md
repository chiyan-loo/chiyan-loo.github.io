---
title: "Understanding PPO and GRPO: Deriving Objectives "
date: 2026-11-06
description: A walkthrough of PPO and GRPO mathematical foundations, exploring how their objective functions are derived and how it works.
---

## Introduction

I have been familiar with GRPO for a while for training reasoning models, but I have never done a deep dive into it. I am still developing a mathematical understanding of RL, so I wanted to make my first post about going deep into two of the foundational advancements in post training: PPO and GRPO. 


## Policy Gradient

In reinforcement learning, we have the language model as our agent interacting with the environment. The state is the prompt and all previously generated tokens. The action is generating the next token. The reward is a score assigned to each response. The agent has stochastic policy $\pi_\theta$ which determines the probability distribution of actions taken at the current state. 

The objective is to maximize expected value of the reward of the policy:
$$J(\theta) = \mathbb{E}_{x,y\sim\pi_\theta}[R(x,y)]$$
where $x$ is the input prompt $y$ is the generated response and $R(x,y)$ is the reward.


## PPO

Traditional policy gradient methods like REINFORCE lead to unstable training because a single gradient step can drastically change the policy gradient. If the gradient update is too large, it can lead to a collapse in performance and greatly change the model's behavior. 

PPO solves this by imposing a clipping function to the objective. This constrains how much a policy can change from a single update.

### Advantage function

The advantage function gives a score of how good an action is compared to what is normally expected. It is defined as
$$A_t = Q(s_t,a_t)-V(s_t)$$

A positive advantage means the action was better than expected, so its probability is increased. A negative advantage means it was worse than expected, so its probability is decreased. Zero advantage means the action is as good as expected.  

In PPO, the advantage uses Generalized Advantage Estimation (GAE), which relies on a learned value function. Another neural network called the critic estimates the expected future reward from a given state, helping the policy determine whether its actions were better or worse than expected.

### Probability ratio

PPO uses the probability ratio
$$r_t(\theta)=\frac{\pi_\theta(a_t|s_t)}{\pi_{\theta_{\text{old}}}(a_t|s_t)}$$
where $\pi_\theta$ is the current updating policy, $\pi_{\theta_{\text{old}}}$ is the old frozen policy, $a_t$ is the action taken at timestep $t$, and $s_t$ is the state at $t$. 

This ratio shows how far the new policy has changed and in which direction. For example, a ratio of 1 would mean that the probability distributions haven't changed. A ratio of 0.7 would mean that probability has decreased by 30%, and a ratio of 1.3 would mean a 30% increase in probability.

### Clipped surrogate objective

Now that we have an advantage that tells us what change is desirable and a probability ratio that tells us how much the policy has changed, we can use them in the objective TRPO maximizes:

$$L^{CPI}(\theta)=\mathbb{E}_t[r_t(\theta)A_t]$$

The superscript CPI refers to conservative policy iteration, where this objective was proposed. We can modify this objective to clip excessively large policy updates, making PPO's objective: 

$$
L^{CLIP}(\theta)=
\mathbb{E}_t[
\min(r_t(\theta)A_t,\operatorname{clip}(r_t(\theta),1-\epsilon,1+\epsilon)A_t)
]
$$

where $\epsilon$ is a hyperparameter like $\epsilon=0.2$. This objective gets the minimum of $L^{CPI}$ and the clipped surrogate objective. This restricts how much the objective can benefit from large policy changes.

Lets look at a worked example to understand this objective.

#### Positive advantage
Suppose:
$A_t=2,\qquad r_t(\theta)=1.5$

The unclipped objective is:
$1.5\times 2=3$

The clipped objective is:
$1.2\times 2=2.4$

Taking the minimum:
$\min(3,2.4)=2.4$

The model increased the probability of a good action by 50%, but PPO limits how much that increase contributes to the objective.

#### Negative advantage
Suppose:
$A_t=-2,\qquad r_t(\theta)=0.5$

The unclipped objective is:
$0.5\times(-2)=-1$

The clipped objective is:
$0.8\times(-2)=-1.6$

Taking the minimum:
$\min(-1,-1.6)=-1.6$

Here, the model decreased the probability of a bad action by 50%. PPO limits the benefit of that excessively large decrease.

## GRPO

PPO requires using a value model acting as a critic which can be expensive to train for large language models. GRPO, introduced in the DeepSeekMath paper, modifies PPO to eliminate the need for the critic model.

Instead of estimating an advantage using a learned value function, GRPO simply estimates it by comparing multiple responses generated for the same prompt.

### Advantage function
Given a query $q$, the policy generates a group of $G$ responses:
${o_1,o_2,\ldots,o_G}$

Each response receives a reward:
${r_1,r_2,\ldots,r_G}$

Now we get the advantage of each response by comparing the rewards of each response to the rewards of other responses in the group. This is basically a z score.

$$A_i = \frac{r_i-\operatorname{mean}(\{r_1,\ldots,r_G\})}{\operatorname{std}(\{r_1,\ldots,r_G\})}$$

This estimates the advantage without training a separate critic model. 

### The GRPO objective

GRPO keeps PPO's clipped objective, but replaces PPO's advantage estimation with its group relative advantage.

The policy model is optimized by maximizing the following objective:
$$
J_{GRPO}(\theta)=
\mathbb{E}[
\frac{1}{G}\sum_{i=1}^{G}
\frac{1}{|o_i|}\sum_{t=1}^{|o_i|}
(\min(r_{i,t}A_{i,t},\operatorname{clip}(r_{i,t},1-\epsilon,1+\epsilon)A_{i,t})-\beta D_{KL})]
$$

Note that, It also uses a KL penalty to discourage the policy from drifting too far from the reference model. Instead of adding KL penalty in the reward, it is applied to the objective directly to avoid complicating calculation of the advantage.  

## My Takeaways

I like how simple yet effective GRPO is. It has become a main training mechanism for reasoning LLMs on problems with verifiable answers and has greatly accelerated LLM progress into the models we have today. However, there are still limitations, such as when all responses in a group recieves the same reward or its sparse rewards, that many researchers are exploring. 

I think this deep dive into PPO and GRPO has made me completely understand them instead of just being "familiar" with them, and I feel better geared to tackle problems that build off of these papers. 

